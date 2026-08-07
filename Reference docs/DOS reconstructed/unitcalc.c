/* Battle-unit construction, stat recompute and BU_Apply_Specials, reconstructed from the three
 * DOS WIZARDS.EXE builds. Conventions (language, annotation form, build keys, one-source-three-
 * builds rule) are in README.md and are not restated here. Ledgers, counts and findings live in
 * the per-item <ID>.evidence.md beside it.
 *
 * Landed so far:  R6.1a BU_Apply_Specials; R6.1b constructor and CoM mana helper;
 *                 R6.1c/R6.1d BU_Apply_Battlefield_Effects;
 *                 R6.1e hero-item application and constructor hit points;
 *                 R6.1f level bonuses and hero-template abilities;
 *                 R6.1g item powers, recompute hit points and CoM movement;
 *                 R6.1h item attack-special helper
 */

#include "MOM_DAT.h"

/*
 * Field-scoped symbolic values used by the landed reconstruction. The raw values stay here so a
 * reviewer can expand any expression back to the executable's immediate operand. Names matching
 * ReMoM are used where the DOS binary's own name->mask tables confirm them. Semantic aliases mark
 * bits that CoM 1 repurposes. See README.md, "Symbolic constants, with raw values retained".
 */

/* _UNITS[].enchantments, item_enchantments and BATTLE_UNIT.enchantments (32-bit). */
#define UE_IMMOLATION             0x00000001UL
#define UE_GUARDIAN_WIND          0x00000002UL
#define UE_BERSERK                0x00000004UL
#define UE_BLOOD_LUST             UE_BERSERK       /* CoM 1 alias */
#define UE_CLOAK_OF_FEAR          0x00000008UL
#define UE_BLACK_CHANNELS         0x00000010UL
#define UE_ANIMATED               UE_BLACK_CHANNELS /* CoM 1 alias */
#define UE_WRAITH_FORM            0x00000020UL
#define UE_REGENERATION           0x00000040UL
#define UE_PATH_FINDING           0x00000080UL
#define UE_LAND_LINK              UE_PATH_FINDING  /* CoM 1 alias */
#define UE_WATER_WALKING          0x00000100UL
#define UE_RESIST_ELEMENTS        0x00000200UL
#define UE_ELEMENTAL_ARMOR        0x00000400UL
#define UE_STONE_SKIN             0x00000800UL
#define UE_FOCUS_MAGIC            UE_STONE_SKIN    /* CoM 1 alias */
#define UE_IRON_SKIN              0x00001000UL
#define UE_ENDURANCE              0x00002000UL
#define UE_INVISIBILITY           0x00008000UL
#define UE_FLIGHT                 0x00020000UL
#define UE_RESIST_MAGIC           0x00040000UL
#define UE_MAGIC_IMMUNITY         0x00080000UL
#define UE_FLAME_BLADE            0x00100000UL
#define UE_ELDRITCH_WEAPON        0x00200000UL
#define UE_MYSTIC_SURGE           UE_ELDRITCH_WEAPON /* CoM 1 alias */
#define UE_TRUE_SIGHT             0x00400000UL
#define UE_HOLY_WEAPON            0x00800000UL
#define UE_HEROISM                0x01000000UL
#define UE_BLESS                  0x02000000UL
#define UE_LION_HEART             0x04000000UL
#define UE_GIANT_STRENGTH         0x08000000UL
#define UE_ORIHALCON              UE_GIANT_STRENGTH /* CoM 1 alias */
#define UE_HOLY_ARMOR             0x20000000UL
#define UE_PLANAR_TRAVEL          0x10000000UL
#define UE_RIGHTEOUSNESS          0x40000000UL
#define UE_SHADOW_ATTACK          UE_RIGHTEOUSNESS  /* CoM 1 alias */
#define UE_INVULNERABILITY        0x80000000UL
#define UE_LOW_WORD(flag)         ((uint16_t)((flag) & 0xFFFFUL))
#define UE_HIGH_WORD(flag)        ((uint16_t)(((flag) >> 16) & 0xFFFFUL))

/* BATTLE_UNIT.Attribs_1 (16-bit). */
#define USA_IMMUNITY_FIRE         0x0001
#define USA_IMMUNITY_STONING      0x0002
#define USA_IMMUNITY_MISSILES     0x0004
#define USA_IMMUNITY_ILLUSION     0x0008
#define USA_IMMUNITY_COLD         0x0010
#define USA_IMMUNITY_MAGIC        0x0020
#define USA_IMMUNITY_DEATH        0x0040
#define USA_IMMUNITY_POISON       0x0080
#define USA_IMMUNITY_WEAPON       0x0100
#define USA_LUCKY                 0x0400
#define USA_CASTER_20             0x2000
#define USA_CASTER_40             0x4000
#define USA_UNKNOWN_8000          0x8000 /* meaning not established by R6.1a/R6.1b */
#define USA_HIGH_BYTE(flag)       ((uint8_t)(((flag) >> 8) & 0xFF))

/* BATTLE_UNIT.Attribs_2 (8-bit meanings, stored in the word field). */
#define USA2_IMMOLATION           0x08
#define USA2_CAUSE_FEAR           0x20
#define USA2_TYPE_IMPORT_MASK     (USA2_IMMOLATION | USA2_CAUSE_FEAR) /* raw 0x0028 */
#define USA2_TYPE_IMPORT_KEEP     0x00D7 /* exact word mask; also clears the high byte */

/* BATTLE_UNIT.Abilities (16-bit). */
#define UA_FANTASTIC              0x0001
#define UA_CREATEOUTPOST          0x0020
#define UA_INVISIBILITY           0x0040
#define UA_NONCORPOREAL           0x0800

/* BATTLE_UNIT.Move_Flags (16-bit). */
#define MV_SWIMMING               0x0004
#define MV_FLYING                 0x0008
#define MV_TELEPORT               0x0010
#define MV_MERGING                0x0080
#define MV_UNKNOWN_0100           0x0100 /* CoM 1 Supreme Light write; read meaning untraced */
#define MV_UNKNOWN_0200           0x0200 /* CoM 1 item-power write; read meaning untraced */
#define MV_LAND_LINK              0x0060 /* CoM 1 aggregate; component meanings not yet decoded */
#define MV_UNKNOWN_0400           0x0400 /* CoM 1: meaning not established */
#define MV_UNKNOWN_0800           0x0800 /* CoM 1 Moves2: halve a changed movement maximum */
#define MV_UNKNOWN_1000           0x1000 /* CoM 1 Moves2: suppress current-movement carry-over */

/* BATTLE_UNIT.Combat_Effects (16-bit). */
#define BUE_VERTIGO               0x0001
#define BUE_MIND_STORM            0x0008
#define BUE_SHATTER               0x0010
#define BUE_WEAKNESS              0x0020
#define BUE_BLACK_SLEEP           0x0040
#define BUE_WARPED_ATTACK         0x0080
#define BUE_WARPED_DEFENSE        0x0100
#define BUE_WARPED_RESIST         0x0200
#define BUE_UNKNOWN_0400          0x0400
#define BUE_HASTE                 0x0800
#define BUE_WEB                   0x1000

/* _UNITS[].mutations (8-bit). */
#define UM_WEAPON_QUALITY_MASK    0x03
#define UM_MAGIC_WEAPONS          0x01
#define UM_CHAOS_CHANNELS_ARMOR   0x04
#define UM_CHAOS_CHANNELS_WINGS   0x08
#define UM_CHAOS_CHANNELS_BREATH  0x10
#define UM_UNDEAD                 0x20

/* BATTLE_UNIT melee/ranged attack-attribute fields (16-bit). */
#define ATT_ARMOR_PIERCING        0x0001
#define ATT_LIFE_STEAL            0x0008
#define ATT_DOOM_DAMAGE           0x0010
#define ATT_DESTRUCTION           0x0020
#define ATT_ILLUSIONARY           0x0040
#define ATT_STONING_TOUCH         0x0080
#define ATT_DEATH_TOUCH           0x0200
#define ATT_POWER_DRAIN           0x0400
#define ATT_DISPEL_EVIL           0x0800
#define ATT_ELDRITCH_WEAPON       0x4000
#define ATT_MYSTIC_SURGE          ATT_ELDRITCH_WEAPON /* CoM 1 alias */

/* Race values and cutoffs. */
#define rt_Generic                0x0E
#define RACE_FIRST_FANTASTIC      0x0F
#define rt_Nature                 0x10
#define rt_Sorcery                0x11
#define rt_Chaos                  0x12
#define rt_Life                   0x13
#define rt_Death                  0x14
#define rt_Fantastic_No_Realm     0x15

/* Battle-unit ranged-type values and decade classes. */
#define RAT_NONE                  (-1)
#define RAT_CLASS(value)          ((value) / 10)
#define RAT_CLASS_BOULDER         1
#define RAT_CLASS_MISSILE         2
#define RAT_CLASS_MAGIC           3
#define RAT_MAGIC_FIRST           30
#define RAT_MAGIC_TYPE_34         34 /* exact CoM 1 Focus Magic result; subtype name unknown */
#define RAT_THROWN                100
#define RAT_FIRE_BREATH           101
#define RAT_LIGHTNING_BREATH      102
#define RAT_STONING_GAZE          103
#define RAT_MULTIPLE_GAZE         104
#define RAT_DEATH_GAZE            105

/* CoM 1 unit-type IDs used by constructor patches and the mana override table. */
#define COM1_UT_CATAPULT          0x25
#define COM1_UT_APPRENTICES       0x3E
#define COM1_UT_GOLEM             0x51
#define COM1_UT_ZOMBIES           0xAE
#define COM1_UT_ANGEL             0xB1
#define COM1_UT_DJINN             0xC3
#define COM1_HOLY_ARMS_TYPE_CEILING 0x97 /* selected set remains an R6.1a open question */
#define COM1_LEVEL_TYPE_CEILING   0x97 /* R6.1f unsigned gate in BU_Apply_Level_Bonus */
#define COM1_LEVEL_TABLE_ROWS     5
#define COM1_LEVEL_TABLE_STRIDE   7
#define COM1_CATAPULT_MAGIC_WP    9

/* Signed slot sentinel used by _UNITS[].Hero_Slot. */
#define HERO_SLOT_NONE            (-1)

/* _combat_node_type values as paired by this routine with BATTLE_UNIT.race. */
#define CMB_NODE_SORCERY          0
#define CMB_NODE_NATURE           1
#define CMB_NODE_CHAOS            2

/* combat_enchantments[] byte indices: attacker entry, then defender entry. */
#define CE_TRUE_LIGHT_ATTACKER          0x00
#define CE_TRUE_LIGHT_DEFENDER          0x01
#define CE_DARKNESS_ATTACKER            0x02
#define CE_DARKNESS_DEFENDER            0x03
#define CE_WARP_REALITY_ATTACKER        0x04
#define CE_WARP_REALITY_DEFENDER        0x05
#define CE_BLACK_PRAYER_ATTACKER        0x06
#define CE_BLACK_PRAYER_DEFENDER        0x07
#define CE_METAL_FIRES_ATTACKER         0x0A
#define CE_METAL_FIRES_DEFENDER         0x0B
#define CE_PRAYER_ATTACKER              0x0C
#define CE_PRAYER_DEFENDER              0x0D
#define CE_HIGH_PRAYER_ATTACKER         0x0E
#define CE_HIGH_PRAYER_DEFENDER         0x0F
#define CE_MASS_INVISIBILITY_ATTACKER   0x16
#define CE_MASS_INVISIBILITY_DEFENDER   0x17
#define CE_ENTANGLE_SIDE_C584           0x18
#define CE_ENTANGLE_SIDE_C586           0x19
#define CE_PRAYER_ON                    1
#define CE_SUPREME_LIGHT_ATTACKER       CE_TRUE_LIGHT_ATTACKER /* CoM 1 slot reuse */
#define CE_SUPREME_LIGHT_DEFENDER       CE_TRUE_LIGHT_DEFENDER /* CoM 1 slot reuse */

/* CoM 1 renames four spells without moving them; the manual's changelog lists
   "Metal Fires -> Blazing March, Death Spell -> Massacre, Death Wish -> Final Wave,
   Word of Death -> Annihilate" (`CoM1manual.HTML:21706`), and both builds' SPELLDAT.LBX
   record 117 carries slot 0x0A either way. Same raw value, CoM 1 name. */
#define CE_BLAZING_MARCH_ATTACKER       CE_METAL_FIRES_ATTACKER /* 0x0A, CoM 1 alias */
#define CE_BLAZING_MARCH_DEFENDER       CE_METAL_FIRES_DEFENDER /* 0x0B, CoM 1 alias */

/* _ITEMS[].Powers (32-bit at +0x2E). */
#define IP_VAMPIRIC                     0x00000001UL
#define IP_GUARDIAN_WIND                0x00000002UL
#define IP_LIGHTNING                    0x00000004UL
#define IP_CLOAK_OF_FEAR                0x00000008UL
#define IP_DESTRUCTION                  0x00000010UL
#define IP_WRAITH_FORM                  0x00000020UL
#define IP_REGENERATION                 0x00000040UL
#define IP_PATHFINDING                  0x00000080UL
#define IP_COM1_LAND_LINK               IP_PATHFINDING     /* raw 0x00000080 */
#define IP_WATER_WALKING                0x00000100UL
#define IP_RESIST_ELEMENTS              0x00000200UL
#define IP_ELEMENTAL_ARMOR              0x00000400UL
#define IP_CHAOS                        0x00000800UL
#define IP_STONING                      0x00001000UL
#define IP_HASTE                        0x00004000UL
#define IP_ENDURANCE                    0x00002000UL
#define IP_INVISIBILITY                 0x00008000UL
#define IP_DEATH                        0x00010000UL
#define IP_FLIGHT                       0x00020000UL
#define IP_RESIST_MAGIC                 0x00040000UL
#define IP_MAGIC_IMMUNITY               0x00080000UL
#define IP_FLAMING                      0x00100000UL
#define IP_HOLY_AVENGER                 0x00200000UL
#define IP_TRUE_SIGHT                   0x00400000UL
#define IP_PHANTASMAL                   0x00800000UL
#define IP_POWER_DRAIN                  0x01000000UL
#define IP_BLESS                        0x02000000UL
#define IP_LION_HEART                   0x04000000UL
#define IP_GIANT_STRENGTH               0x08000000UL
#define IP_PLANAR_TRAVEL                0x10000000UL
#define IP_MERGING                      0x20000000UL
#define IP_RIGHTEOUSNESS                0x40000000UL
#define IP_COM1_SHADOW                  IP_RIGHTEOUSNESS    /* raw 0x40000000 */
#define IP_INVULNERABILITY              0x80000000UL
/* CoM1manual.HTML names these replacements; CoM helptext.txt retains the old names (Q21). */
#define IP_COM1_TELEPORTATION           IP_ENDURANCE      /* raw 0x00002000 */
#define IP_COM1_DIVINE_PROTECTION       IP_POWER_DRAIN    /* raw 0x01000000 */
#define IP_COM1_INNER_FIRE              IP_GIANT_STRENGTH /* raw 0x08000000 */
#if BUILD == COM1
#define IP_ATTACK_SPECIAL_POWER_DRAIN_INPUT IP_COM1_DIVINE_PROTECTION
#else
#define IP_ATTACK_SPECIAL_POWER_DRAIN_INPUT IP_POWER_DRAIN
#endif
#define IP_LOW_WORD(flag)               ((uint16_t)((flag) & 0xFFFFUL))
#define IP_HIGH_WORD(flag)              ((uint16_t)(((flag) >> 16) & 0xFFFFUL))
#define EVENT_ACTIVE                    2
#define CITY_ENCHANT_HEAVENLY_LIGHT     0x15 /* battlefield +0x157E +0x15 = raw +0x1593 */
#define COM1_PLAYER_GUARDIAN_OFF        0x006A

/* R6.1d CoM 1 city/player/global fields. */
#define CITY_ENCHANT_FLYING_FORTRESS    0x08
#define CITY_ENCHANT_WARD_FIRST         0x09 /* Nature, Sorcery, Chaos, Life, Death */
#define COM1_PLAYER_TACTICIAN_OFF       0x0067
#define PLAYER_RETORT_UNKNOWN_006A      0x006A /* CP 1.60 dead probe; semantic name unproved */
#define OE_ETERNAL_NIGHT                0
#define OE_CRUSADE                      0x11
#define OE_CHARM_OF_LIFE                0x15

/* Item weapon types at _ITEMS[].type (+0x21). */
#define it_Sword                        0
#define it_Mace                         1
#define it_Axe                          2
#define it_Bow                          3
#define it_Staff                        4
#define it_Wand                         5
#define it_Misc                         6
#define it_Shield                       7

/* Hero-template ability word at record +0x02. */
#define HSA_BLADEMASTER                  0x00000040UL
#define HSA_BLADEMASTER2                 0x00000080UL
#define HSA_MIGHT                        0x00008000UL
#define HSA_MIGHT2                       0x00010000UL
#define HSA_ARCANE_POWER                 0x00040000UL
#define HSA_ARCANE_POWER2                0x00080000UL
#define HSA_AGILITY2                     0x04000000UL
#define HSA_LUCKY                        0x08000000UL
#define HSA_NOBLE                        0x20000000UL
#define HSA_AGILITY                      0x80000000UL
#define HA_CONSTITUTION                 0x1000
#define HA_SUPER_CONSTITUTION           0x2000

#define UA_LARGESHIELD                  0x0002
#define ITEM_SLOT_EMPTY                 (-1)

/* Byte offsets used where the executable deliberately performs partial-field stores. */
#define BU_OFF_MOVE_FLAGS_LO      0x16
#define BU_OFF_MOVE_FLAGS_HI      0x17
#define BU_OFF_ATTRIBS_1_LO       0x18
#define BU_OFF_ATTRIBS_1_HI       0x19

/* MoM 1.31's unindexed Chaos Surge read: player 0's byte, repeated inside the player loop. */
#define PLAYER0_CHAOS_SURGE_ADDR  0xA356

/* CoM 1 side tables/globals read by Battle_Unit_Moves2. */
#define COM1_LOGISTICS_MAX_ADDR       0x3AC8
#define COM1_ENTANGLE_PLAYER_C584     0xC584
#define COM1_ENTANGLE_PLAYER_C586     0xC586

/* ===========================================================================================
 * BU_Apply_Specials(bu, enchantments, mutations)                                      [R6.1a]
 *
 * Called from the battle-unit constructor and from the stat recompute, and from nowhere else
 * (exhaustive near-call scan of 0x88000-0x9F000):
 *
 *     131:0x8F2A2 / 0x90A1D    160:=          com1:0x8F0E8 / 0x90743
 *
 * Frame: bu at [bp+6] (far), enchantments low word at [bp+0xa] and high word at [bp+0xc],
 * mutations at [bp+0xe] loaded into cl at 0x8F314. `push si` at 0x8F313 is scaffolding; si is
 * read once (131/160 only, 0x8F84F) and never in CoM 1.
 *
 * 1.31 ends at its own retf. CP 1.60 and CoM 1 replace the epilogue with a jump to a tail
 * relocated into space freed in the constructor; those tails carry each build's only retf.
 *
 *     build    main body            tail                 reached by      retf
 *     mom131   0x8F310-0x8F881      -                    -               0x8F880
 *     mom160   0x8F310-0x8F881      0x8F197-0x8F26E      jmp 0x8F87E     0x8F26D
 *     com1     0x8F310-0x8F881      0x8F15C-0x8F233      jmp 0x8F87E     0x8F232
 *
 * MoM 1.31 and CP 1.60 share one body (13 bytes differ across 1,393). CoM 1 executes many of
 * the same blocks in a different order, and order is load-bearing here, so it is written as its
 * own branch rather than folded in; see the evidence document's execution-order index.
 * =========================================================================================== */

void __far BU_Apply_Specials(struct s_BATTLE_UNIT __far *bu, uint32_t ench, uint8_t mut)
{
    /* 131:0x8F310  160:=  com1:0x8F310 -- push bp / mov bp,sp / push si / cl = mut */

#if BUILD == MOM131 || BUILD == CP160

    /* --- UE_WATER_WALKING 0x00000100 ---------------------- 131:0x8F31D  160:=  com1:0x8F320 */
    if (ench & UE_WATER_WALKING)
        bu->Move_Flags |= MV_SWIMMING;                /* 131:0x8F32F  160:=  com1:0x8F326 */

    /* --- UE_TRUE_SIGHT 0x00400000 ------------------------- 131:0x8F338  160:=  com1:0x8F335 */
    if (ench & UE_TRUE_SIGHT)
        bu->Attribs_1 |= USA_IMMUNITY_ILLUSION;       /* 131:0x8F34F  160:= */

    /* --- UE_INVULNERABILITY 0x80000000 -------------------- 131:0x8F359  160:=  com1:0x8F33F */
    if (ench & UE_INVULNERABILITY)
        bu->Attribs_1 |= USA_IMMUNITY_WEAPON;         /* 131:0x8F370  160:= */

    /* --- UE_FLIGHT 0x00020000 ----------------------------- 131:0x8F37A  160:=  com1:0x8F34A */
    if (ench & UE_FLIGHT)
        bu->Move_Flags |= MV_FLYING;                  /* 131:0x8F391  160:= */

    /* --- UE_WRAITH_FORM 0x00000020 ------------------------ 131:0x8F39A  160:=  com1:0x8F354 */
    if (ench & UE_WRAITH_FORM) {
        bu->Abilities  |= UA_NONCORPOREAL;            /* 131:0x8F3B1  160:= */
        bu->Attribs_1  |= USA_IMMUNITY_WEAPON;        /* 131:0x8F3C2  160:= */
        bu->Move_Flags |= MV_SWIMMING;                /* 131:0x8F3D3  160:= */
        /* no Weapon_Plus1 in either MoM build; CoM 1 adds one */
    }

    /* --- UM_UNDEAD, mutation 0x20 ------------------------- 131:0x8F3DC  160:=  com1:0x8F4B4 */
    if (mut & UM_UNDEAD) {
        bu->race       = rt_Death;                    /* 131:0x8F3E4  160:= */
        bu->Abilities |= UA_FANTASTIC;                /* 131:0x8F3F0  160:= */
    }

    /* --- UE_BLACK_CHANNELS 0x00000010 --------------------- 131:0x8F3FA  160:=  com1:0x8F4D0 */
    if (ench & UE_BLACK_CHANNELS) {
        if (bu->melee > 0) {                          /* 131:0x8F410  160:= */
            bu->melee      += 2;                      /* 131:0x8F41C  160:= */
            bu->Gold_Melee += 2;                      /* 131:0x8F42B  160:= */
        }
        if (bu->ranged_type != RAT_NONE) {            /* the -1 sentinel, not 0  131:0x8F437  160:= */
            bu->ranged      += 1;                     /* 131:0x8F445  160:= */
            bu->Gold_Ranged += 1;                     /* 131:0x8F455  160:= */
        }
        bu->defense      += 1;                        /* 131:0x8F465  160:= */
        bu->Gold_Defense += 1;                        /* 131:0x8F475  160:= */
        bu->resist       += 1;                        /* 131:0x8F485  160:= */
        bu->Gold_Resist  += 1;                        /* 131:0x8F495  160:= */
        bu->race       = rt_Death;                    /* 131:0x8F4A1  160:= */
        bu->Abilities |= UA_FANTASTIC;                /* 131:0x8F4AD  160:= */
        bu->Attribs_1 |= USA_IMMUNITY_ILLUSION | USA_IMMUNITY_COLD
                      | USA_IMMUNITY_POISON;          /* raw 0x0098; 131:0x8F4BE  160:= */
    }

    /* --- UE_IRON_SKIN 0x00001000, else UE_STONE_SKIN 0x00000800 ------------------------------
     * The else-arm is real: 131:0x8F4F9 is `jmp 0x8F52C`, so a unit holding both gets +5, never
     * +6. CoM 1 has no else-arm and repurposed the 0x00000800 slot entirely. */
    if (ench & UE_IRON_SKIN) {                        /* 131:0x8F4C8  160:=  com1:0x8F71F */
        bu->defense      += 5;                        /* 131:0x8F4E0  160:= */
        bu->Gold_Defense += 5;                        /* 131:0x8F4F0  160:= */
    } else if (ench & UE_STONE_SKIN) {                /* 131:0x8F4FB  160:=  com1:— */
        bu->defense      += 1;                        /* 131:0x8F513  160:= */
        bu->Gold_Defense += 1;                        /* 131:0x8F523  160:= */
    }

    /* --- UE_GUARDIAN_WIND 0x00000002 ---------------------- 131:0x8F52C  160:=  com1:0x8F51A */
    if (ench & UE_GUARDIAN_WIND)
        bu->Attribs_1 |= USA_IMMUNITY_MISSILES;       /* 131:0x8F543  160:= */

    /* --- UE_MAGIC_IMMUNITY 0x00080000 --------------------- 131:0x8F54D  160:=  com1:0x8F53B */
    if (ench & UE_MAGIC_IMMUNITY)
        bu->Attribs_1 |= USA_IMMUNITY_MAGIC;          /* 131:0x8F564  160:= */

    /* --- UE_FLAME_BLADE 0x00100000 ------------------------ 131:0x8F56E  160:=  com1:0x8F55C */
    if (ench & UE_FLAME_BLADE) {
        if (bu->melee > 0) {                          /* 131:0x8F581  160:= */
            bu->melee      += 2;                      /* 131:0x8F58D  160:= */
            bu->Gold_Melee += 2;                      /* 131:0x8F59C  160:= */
        }
        if (bu->ranged_type == RAT_THROWN             /* 131:0x8F5A8  160:= */
            || RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE) { /* 131:0x8F5B2  160:= */
            bu->ranged      += 2;                     /* 131:0x8F5C9  160:= */
            bu->Gold_Ranged += 2;                     /* 131:0x8F5D9  160:= */
        }
        if (bu->Weapon_Plus1 == 0)                    /* 131:0x8F5E5  160:= */
            bu->Weapon_Plus1 = 1;                     /* 131:0x8F5EF  160:= */
    }

    /* --- UE_GIANT_STRENGTH 0x08000000 --------------------- 131:0x8F5F4  160:=  com1:0x8F853 */
    if (ench & UE_GIANT_STRENGTH) {
        if (bu->melee > 0) {                          /* 131:0x8F607  160:= */
            bu->melee      += 1;                      /* 131:0x8F613  160:= */
            bu->Gold_Melee += 1;                      /* 131:0x8F622  160:= */
        }
        if (bu->ranged_type == RAT_THROWN) {          /* 131:0x8F62E  160:= */
            bu->ranged      += 1;                     /* 131:0x8F63C  160:= */
            bu->Gold_Ranged += 1;                     /* 131:0x8F64C  160:= */
        }
    }

    /* --- UE_IMMOLATION 0x00000001 ------------------------- 131:0x8F655  160:=  com1:0x8F5E7 */
    if (ench & UE_IMMOLATION)
        bu->Attribs_2 |= USA2_IMMOLATION;             /* 131:0x8F66C  160:= */

    /* --- UE_ELDRITCH_WEAPON 0x00200000 -------------------- 131:0x8F675  160:=  com1:0x8F5FF */
    if (ench & UE_ELDRITCH_WEAPON) {
        bu->melee_attack_attributes |= ATT_ELDRITCH_WEAPON; /* raw 0x4000; 131:0x8F68C  160:= */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE /* 131:0x8F699  160:= */
            || bu->ranged_type == RAT_THROWN)         /* 131:0x8F6AC  160:= */
            bu->ranged_attack_attributes |= ATT_ELDRITCH_WEAPON; /* raw 0x4000; 131:0x8F6BA  160:= */
        if (bu->Weapon_Plus1 == 0)                    /* 131:0x8F6C7  160:= */
            bu->Weapon_Plus1 = 1;                     /* 131:0x8F6D1  160:= */
    }

    /* --- UM_CHAOS_CHANNELS demon-skin armor, mutation 0x04 - 131:0x8F6D6  160:=  com1:0x8F735 */
    if (mut & UM_CHAOS_CHANNELS_ARMOR) {
        bu->defense      += 3;                        /* 131:0x8F6E2  160:= */
        bu->Gold_Defense += 3;                        /* 131:0x8F6F2  160:= */
        bu->race = rt_Chaos;                          /* 131:0x8F6FE  160:= */
    }

    /* --- UM_CHAOS_CHANNELS demon wings, mutation 0x08 ----- 131:0x8F703  160:=  com1:0x8F457 */
    if (mut & UM_CHAOS_CHANNELS_WINGS) {
        bu->Move_Flags |= MV_FLYING;                  /* 131:0x8F70F  160:= */
        bu->race = rt_Chaos;                          /* 131:0x8F71B  160:= */
    }

    /* --- UM_CHAOS_CHANNELS fire breath, mutation 0x10 ----- 131:0x8F720  160:=  com1:0x8F474 */
    if (mut & UM_CHAOS_CHANNELS_BREATH) {
        bu->ranged      = 2;                          /* assignment, not +=  131:0x8F728  160:= */
        bu->ranged_type = RAT_FIRE_BREATH;            /* 131:0x8F730  160:= */
        bu->race        = rt_Chaos;                   /* 131:0x8F738  160:= */
    }

    /* --- UE_LION_HEART 0x04000000 ------------------------- 131:0x8F73D  160:=  com1:0x8F660 */
    if (ench & UE_LION_HEART) {
        if (bu->melee > 0) {                          /* 131:0x8F753  160:= */
            bu->melee      += 3;                      /* 131:0x8F75F  160:= */
            bu->Gold_Melee += 3;                      /* 131:0x8F76E  160:= */
        }
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE /* 131:0x8F77A  160:= */
            || RAT_CLASS(bu->ranged_type) == RAT_CLASS_BOULDER /* 131:0x8F78D  160:= */
            || bu->ranged_type == RAT_THROWN) {       /* 131:0x8F7A0  160:= */
            bu->ranged      += 3;                     /* 131:0x8F7AE  160:= */
            bu->Gold_Ranged += 3;                     /* 131:0x8F7BE  160:= */
        }
        bu->resist      += 3;                         /* ungated  131:0x8F7CE  160:= */
        bu->Gold_Resist += 3;                         /* 131:0x8F7DE  160:= */
    }

    /* --- UE_HOLY_ARMOR 0x20000000 ------------------------- 131:0x8F7E7  160:=  com1:0x8F7C1 */
    if (ench & UE_HOLY_ARMOR) {
        bu->defense      += 2;                        /* 131:0x8F7FE  160:= */
        bu->Gold_Defense += 2;                        /* 131:0x8F80E  160:= */
    }

    /* --- race == rt_Death immunity gate ------------------- 131:0x8F817  160:=  com1:— ------
     * CoM 1 deleted this gate and folded the grant into the mutation and Animated blocks. */
    if (bu->race == rt_Death) {
#if BUILD == MOM131
        bu->Attribs_1 |= USA_IMMUNITY_DEATH;          /* raw 0x0040; 131:0x8F828 */
#elif BUILD == CP160
        bu->Attribs_1 |= USA_IMMUNITY_DEATH | USA_IMMUNITY_POISON
                      | USA_IMMUNITY_COLD | USA_IMMUNITY_ILLUSION; /* raw 0x00D8; 160:0x8F828 */
#endif
    }


    /* --- UE_BERSERK 0x00000004 ---------------------------- 131:0x8F832  160:=  com1:— ------
     * Last block in the routine, so the doubling takes every melee contribution above it.
     * CoM 1 removed the effect and reuses the bit; see its own branch. */
    if (ench & UE_BERSERK) {
        if (bu->melee > 0) {                          /* 131:0x8F845  160:= */
            bu->Gold_Melee += bu->melee;              /* pre-doubling value  131:0x8F856  160:= */
            bu->melee <<= 1;                          /* byte shift  131:0x8F860  160:= */
        }
        bu->Grey_Defense = bu->defense;               /* assignment, not +=  131:0x8F872  160:= */
        bu->defense      = -20;                       /* 0xEC  131:0x8F879  160:0x8F876 */
    }

#if BUILD == MOM131
    return;                                           /* 131:0x8F87E, retf 131:0x8F880 */
#elif BUILD == CP160
    goto relocated_tail;                              /* 160:0x8F87E, jmp -> 0x8F197 */

/* ---------------------------------------------------------------------------------------------
 * CP 1.60 relocated tail, 0x8F197-0x8F26E. In 1.31 this logic is inlined in the CONSTRUCTOR at
 * 0x8F1A0ff, reading the constructor's locals ([bp-7] mutations at 0x8F1BA, [bp-4]/[bp-6]
 * enchantments at 0x8F1C0). Moving it here makes it run at both call sites instead of once.
 * ------------------------------------------------------------------------------------------- */
relocated_tail:
    /* --- Holy Arms grants Holy Weapon --------------------- 160:0x8F197 */
    if (players[bu->controller_idx].holy_arms > 0     /* [bx+0xA35F], stride 0x4C8  160:0x8F1A6 */
        && !(bu->Abilities & UA_FANTASTIC)            /* 160:0x8F1B0 */
        && !(mut & UM_UNDEAD))                        /* 160:0x8F1B8 */
        bu->enchantments |= UE_HOLY_WEAPON;           /* byte write at +0x3C  160:0x8F1BE */

    /* --- UE_HOLY_WEAPON 0x00800000 ------------------------ 160:0x8F1C5 */
    if (ench & UE_HOLY_WEAPON) {
        bu->melee_tohit += 1;                         /* 160:0x8F1DD */
        if (bu->ranged_type == RAT_THROWN             /* 160:0x8F1E9 */
            || RAT_CLASS(bu->ranged_type) <= RAT_CLASS_MISSILE) /* 160:0x8F1FB */
            bu->ranged_tohit += 1;                    /* 160:0x8F203 */
        if (bu->Weapon_Plus1 == 0)                    /* 160:0x8F207 */
            bu->Weapon_Plus1 = 1;                     /* 160:0x8F20E */
    }

    /* --- fantastic or undead get the magic-weapon upgrade - 160:0x8F213 */
    if ((bu->Abilities & UA_FANTASTIC) || bu->race >= RACE_FIRST_FANTASTIC) { /* 160:0x8F216, 160:0x8F221 */
        if (bu->Weapon_Plus1 == 0)                    /* 160:0x8F22B */
            bu->Weapon_Plus1 = 1;                     /* 160:0x8F235 */
    }

    /* --- to-hit normalisation ----------------------------- 160:0x8F23A ----------------------
     * Two entry paths and only one is guarded. `je` at 160:0x8F243 lands on the shared
     * subtraction at 0x8F257, bypassing the `cmp al,0 / jle` pair at 0x8F24F/0x8F251, so on the
     * ranged_type == -1 path the last two writes execute unconditionally with al still holding
     * melee_tohit -- including when melee_tohit is negative, which lowers base tohit. */
    {
        int8_t common = bu->melee_tohit;              /* 160:0x8F23A */
        if (bu->ranged_type != RAT_NONE) {            /* 160:0x8F23E, je 160:0x8F243 -> 0x8F257 */
            if (common > bu->ranged_tohit)            /* 160:0x8F245 */
                common = bu->ranged_tohit;            /* 160:0x8F24B */
            if (common <= 0)                          /* 160:0x8F24F, jle 160:0x8F251 -> 0x8F25F */
                goto no_shift;
            bu->ranged_tohit -= common;               /* 160:0x8F253 */
        }
        bu->melee_tohit -= common;                    /* 160:0x8F257 */
        bu->tohit       += common;                    /* 160:0x8F25B */
    no_shift:
        if (bu->ranged_type == RAT_NONE)              /* 160:0x8F25F */
            bu->ranged_tohit = 0;                     /* 160:0x8F266 */
    }
    return;                                           /* retf 160:0x8F26D */
#endif

#elif BUILD == COM1
    /* Every statement in this branch is 131:— 160:—; the annotations carry the com1 address
     * alone rather than repeating two em dashes on each line. bu, ench-low (dx) and ench-high
     * (ax) are loaded once at com1:0x8F317-0x8F31D and stay live to com1:0x8F457. */

    if (ench & UE_WATER_WALKING) bu->Move_Flags |= MV_SWIMMING; /* com1:0x8F320, 0x8F326 */
    if (ench & UE_INVISIBILITY) bu->Abilities |= UA_INVISIBILITY; /* com1:0x8F32B, 0x8F330 */
    if (ench & UE_TRUE_SIGHT) bu->Attribs_1 |= USA_IMMUNITY_ILLUSION; /* com1:0x8F335, 0x8F33A */
    if (ench & UE_INVULNERABILITY) bu->Attribs_1 |= USA_IMMUNITY_WEAPON; /* com1:0x8F33F, 0x8F344 */
    if (ench & UE_FLIGHT) bu->Move_Flags |= MV_FLYING; /* com1:0x8F34A, 0x8F34F */

    /* --- UE_WRAITH_FORM 0x00000020 ------------------------------------ com1:0x8F354 */
    if (ench & UE_WRAITH_FORM) {
        bu->Abilities  |= UA_NONCORPOREAL;            /* com1:0x8F35A */
        bu->Attribs_1  |= USA_IMMUNITY_WEAPON;        /* com1:0x8F360 */
        bu->Move_Flags |= MV_SWIMMING;                /* com1:0x8F366 */
        if (bu->Weapon_Plus1 == 0)                    /* not in either MoM build  com1:0x8F36B */
            bu->Weapon_Plus1 = 1;                     /* com1:0x8F372 */
    }
    /* com1:0x8F377  jmp 0x8F3B9, over the detached helper and the nop fill */

    /* --- UE_ENDURANCE 0x00002000 --------------------------------------- com1:0x8F439 */
    if (ench & UE_ENDURANCE) {
        bu->defense      += 2;                        /* com1:0x8F43F */
        bu->Gold_Defense += 2;                        /* com1:0x8F444 */
    }

    /* --- UM_CHAOS_CHANNELS demon wings, mutation 0x08 ------------------ com1:0x8F457 */
    if (mut & UM_CHAOS_CHANNELS_WINGS) {
        bu->Move_Flags |= MV_FLYING;                  /* com1:0x8F463 */
        bu->Abilities  |= UA_FANTASTIC;               /* not in either MoM build  com1:0x8F469 */
        bu->race = rt_Chaos;                          /* com1:0x8F46F */
    }

    /* --- UM_CHAOS_CHANNELS fire breath, mutation 0x10 ------------------ com1:0x8F474 */
    if (mut & UM_CHAOS_CHANNELS_BREATH) {
        bu->ranged      = 4;                          /* 2 in both MoM builds  com1:0x8F47C */
        bu->ranged_type = RAT_FIRE_BREATH;            /* com1:0x8F481 */
        bu->Abilities  |= UA_FANTASTIC;               /* com1:0x8F486 */
        bu->race = rt_Chaos;                          /* com1:0x8F48C */
    }

    /* --- 0x00000004 "BloodL." -- the Berserk slot, repurposed ---------- com1:0x8F491 ---------
     * Writes the Undead mutation into the PERSISTENT unit record, then sets the local bit so the
     * next block runs in the same pass. */
    if (ench & UE_BLOOD_LUST) {
        bu->race = rt_Death;                          /* com1:0x8F49A */
        _UNITS[bu->unit_idx].mutations |= UM_UNDEAD;  /* stride 0x20 via [0x9EC2]  com1:0x8F4AC */
        mut |= UM_UNDEAD;                             /* com1:0x8F4B1 */
    }

    /* --- UM_UNDEAD, mutation 0x20 -------------------------------------- com1:0x8F4B4 */
    if (mut & UM_UNDEAD) {
        bu->race       = rt_Death;                    /* com1:0x8F4BC */
        bu->Abilities |= UA_FANTASTIC;                /* com1:0x8F4C1 */
        bu->Attribs_1 |= USA_IMMUNITY_DEATH | USA_IMMUNITY_COLD
                      | USA_IMMUNITY_ILLUSION;        /* raw 0x0058, no Poison; com1:0x8F4C6 */
        bu->Abilities &= ~UA_CREATEOUTPOST;           /* raw 0xFFDF; com1:0x8F4CB */
    }

    /* --- 0x00000010 "Animated" -- the Black Channels slot -------------- com1:0x8F4D0 */
    if (ench & UE_ANIMATED) {
        if (bu->melee > 0) {                          /* com1:0x8F4DE */
            bu->melee += 1;      bu->Gold_Melee   += 1;   /* +1, not +2  com1:0x8F4E4, 0x8F4E7 */
        }
        if (bu->ranged_type != RAT_NONE) {            /* com1:0x8F4EB */
            bu->ranged += 1;     bu->Gold_Ranged  += 1;   /* com1:0x8F4F2, 0x8F4F6 */
        }
        bu->defense += 1;        bu->Gold_Defense += 1;   /* com1:0x8F4FA, 0x8F4FE */
        bu->tohit   += 1;                             /* no Gold_* twin  com1:0x8F502 */
        bu->Attribs_1 |= USA_IMMUNITY_WEAPON;         /* via +0x19  com1:0x8F506 */
        bu->race       = rt_Death;                    /* com1:0x8F50B */
        bu->Abilities |= UA_FANTASTIC;                /* com1:0x8F510 */
        bu->Attribs_1 |= USA_IMMUNITY_DEATH | USA_IMMUNITY_COLD
                      | USA_IMMUNITY_ILLUSION;        /* raw 0x0058; com1:0x8F515 */
        /* no resist bonus; both MoM builds give +1 */
    }

    if (ench & UE_GUARDIAN_WIND) bu->Attribs_1 |= USA_IMMUNITY_MISSILES; /* com1:0x8F51A, 0x8F531 */
    if (ench & UE_MAGIC_IMMUNITY) bu->Attribs_1 |= USA_IMMUNITY_MAGIC; /* com1:0x8F53B, 0x8F552 */

    /* --- UE_FLAME_BLADE 0x00100000 ------------------------------------- com1:0x8F55C */
    if (ench & UE_FLAME_BLADE) {
        if (bu->melee > 0) {                          /* com1:0x8F56F */
            bu->melee += 3;      bu->Gold_Melee += 3;     /* +3, not +2  com1:0x8F57B, 0x8F58A */
        }
        /* com1:0x8F596 `cmp ranged_type,0x64` is dead: its `je` was nopped to 90 90 at
         * com1:0x8F59B, so Thrown no longer reaches the bonus. */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE) { /* com1:0x8F5A0 */
            bu->ranged += 2;     bu->Gold_Ranged += 2;    /* com1:0x8F5B7, 0x8F5C7 */
        }
        if (bu->Weapon_Plus1 == 0)                    /* com1:0x8F5D3 */
            bu->Weapon_Plus1 = 1;                     /* com1:0x8F5DD */
    }

    if (ench & UE_IMMOLATION) bu->Attribs_2 |= USA2_IMMOLATION; /* com1:0x8F5E7, 0x8F5F6 */

    /* --- 0x00200000 "Mystic Surge", attack-attribute half -------------- com1:0x8F5FF */
    if (ench & UE_MYSTIC_SURGE) {
        bu->melee_attack_attributes |= ATT_MYSTIC_SURGE; /* raw 0x4000; com1:0x8F616 */
        /* com1:0x8F62E `cmp ax,2` is dead: its `je` became `jmp 0x8F63D` at com1:0x8F631, so
         * the ranged attributes are set for every ranged type and com1:0x8F633-0x8F63C,
         * including the jne at com1:0x8F63B, is unreachable. */
        bu->ranged_attack_attributes |= ATT_MYSTIC_SURGE; /* raw 0x4000; com1:0x8F644 */
        if (bu->Weapon_Plus1 == 0)                    /* com1:0x8F651 */
            bu->Weapon_Plus1 = 1;                     /* com1:0x8F65B */
    }

    /* --- UE_LION_HEART 0x04000000 -------------------------------------- com1:0x8F660 */
    if (ench & UE_LION_HEART) {
        if (bu->melee > 0) {                          /* com1:0x8F676 */
            bu->melee += 3;      bu->Gold_Melee += 3;     /* com1:0x8F682, 0x8F691 */
        }
        /* com1:0x8F6C3 `cmp ranged_type,0x64` is dead: its `jne` became `jmp 0x8F6EA` at
         * com1:0x8F6C8, so Thrown no longer qualifies. */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE /* com1:0x8F69D */
            || RAT_CLASS(bu->ranged_type) == RAT_CLASS_BOULDER) { /* com1:0x8F6B0 */
            bu->ranged += 3;     bu->Gold_Ranged += 3;    /* com1:0x8F6D1, 0x8F6E1 */
        }
        bu->resist += 3;         bu->Gold_Resist += 3;    /* com1:0x8F6F1, 0x8F701 */
    }

    /* --- UE_IRON_SKIN 0x00001000, no longer an else-arm ---------------- com1:0x8F71F */
    if (ench & UE_IRON_SKIN) {
        bu->defense += 5;        bu->Gold_Defense += 5;   /* com1:0x8F72B, 0x8F730 */
    }

    /* --- UM_CHAOS_CHANNELS demon-skin armor, mutation 0x04 ------------- com1:0x8F735 */
    if (mut & UM_CHAOS_CHANNELS_ARMOR) {
        bu->defense += 3;        bu->Gold_Defense += 3;   /* com1:0x8F741, 0x8F74B */
        bu->Abilities |= UA_FANTASTIC;                /* not in either MoM build  com1:0x8F751 */
        bu->race = rt_Chaos;                          /* com1:0x8F757 */
    }

    /* --- 0x00000080 "Land Link" -- the Path Finding slot --------------- com1:0x8F75C */
    if (ench & UE_LAND_LINK) {
        if (bu->race >= RACE_FIRST_FANTASTIC) {       /* com1:0x8F765 */
            bu->melee   += 2;    bu->Gold_Melee   += 2;   /* com1:0x8F76C, 0x8F770 */
            bu->defense += 2;    bu->Gold_Defense += 2;   /* com1:0x8F775, 0x8F77A */
            if (bu->ranged_type > RAT_THROWN) {       /* breath/gaze only  com1:0x8F77F */
                bu->ranged += 2; bu->Gold_Ranged  += 2;   /* com1:0x8F786, 0x8F78B */
            }
        }
        bu->Move_Flags |= MV_LAND_LINK;               /* raw 0x0060, ungated; com1:0x8F790 */
    }

    /* --- 0x00200000 "Mystic Surge", stat half -------------------------- com1:0x8F795 */
    if (ench & UE_MYSTIC_SURGE) {
        bu->race = rt_Fantastic_No_Realm;             /* com1:0x8F79E */
        bu->defense += 2;        bu->Gold_Defense += 2;   /* com1:0x8F7A3, 0x8F7A8 */
        bu->resist  -= 2;        bu->Grey_Resist  += 2;   /* penalty tracker  com1:0x8F7AD, 0x8F7B2 */
        bu->Attribs_1 &= ~USA_UNKNOWN_8000;           /* raw 0x7FFF, via +0x19; com1:0x8F7B7 */
        bu->enchantments &= ~UE_SHADOW_ATTACK;        /* via +0x3D  com1:0x8F7BC */
    }

    /* --- UE_HOLY_ARMOR 0x20000000, now conditional --------------------- com1:0x8F7C1 */
    if (ench & UE_HOLY_ARMOR) {
        if (bu->defense <= 5) {                       /* reads the RUNNING defense  com1:0x8F7CC */
            bu->defense += 2;    bu->Gold_Defense += 2;   /* com1:0x8F7D3, 0x8F7D8 */
        } else {
            bu->toblock += 1;                         /* com1:0x8F7DF */
        }
    }

    /* --- 0x00000800 "FocusMagic" -- the Stone Skin slot ---------------- com1:0x8F7E6 */
    if (ench & UE_FOCUS_MAGIC) {
        if (bu->mana_max != 0)                        /* com1:0x8F7EF */
            bu->mana_max += 15;                       /* com1:0x8F7F6 */
        if (bu->ammo > 0) {                           /* com1:0x8F7FB */
            int8_t base_rt = unit_types[_UNITS[bu->unit_idx].type].ranged_type;
                                                      /* com1:0x8F804 .. com1:0x8F81F */
            /* signed: com1:0x8F827 is `7C 10` (jl), so base_rt == -1 takes the fallback */
            if (base_rt >= RAT_MAGIC_FIRST && base_rt != RAT_THROWN) { /* com1:0x8F825, com1:0x8F829 */
                bu->ranged += 3; bu->Gold_Ranged += 3;    /* com1:0x8F82D, 0x8F832 */
            } else if (bu->ranged_type > RAT_THROWN) { /* com1:0x8F839 */
                bu->ranged += 3; bu->Gold_Ranged += 3;    /* same site, via com1:0x8F83E */
            } else {
                bu->ranged_type = RAT_MAGIC_TYPE_34;  /* com1:0x8F840 */
                if (bu->ranged < 3)                   /* com1:0x8F845 */
                    bu->ranged = 3;                   /* com1:0x8F84C */
            }
        }
    }

    /* --- 0x08000000 "Orihalcon" -- the Giant Strength slot ------------- com1:0x8F853 */
    if (ench & UE_ORIHALCON) {
        bu->resist += 1;         bu->Gold_Resist += 1;    /* com1:0x8F85E, 0x8F862 */
        if (bu->ranged_type >= RAT_MAGIC_FIRST && bu->ranged_type < RAT_THROWN) { /* com1:0x8F866, com1:0x8F86D */
            bu->ranged += 2;     bu->Gold_Ranged += 2;    /* com1:0x8F874, 0x8F879 */
        }
    }
    goto relocated_tail;                              /* com1:0x8F87E, jmp -> 0x8F15C */

/* ---------------------------------------------------------------------------------------------
 * CoM 1 relocated tail, 0x8F15C-0x8F233. Same shape as CP 1.60's except for the unit-type
 * ceiling on the Holy Arms grant and the two exclusions CoM 1 drops.
 * ------------------------------------------------------------------------------------------- */
relocated_tail:
    /* unsigned: com1:0x8F172 is `73 1E` (jae), unlike the signed `jl` at com1:0x8F827 */
    if ((uint8_t)_UNITS[bu->unit_idx].type < COM1_HOLY_ARMS_TYPE_CEILING) { /* com1:0x8F16C, com1:0x8F170 */
        if (players[bu->controller_idx].holy_arms > 0)/* com1:0x8F183 */
            bu->enchantments |= UE_HOLY_WEAPON;       /* com1:0x8F18D */
    }
    /* no `Abilities & 1` or `mut & 0x20` exclusion; CP 1.60 has both */

    if (ench & UE_HOLY_WEAPON) {                      /* com1:0x8F192 */
        bu->melee_tohit += 1;                         /* com1:0x8F1A2 */
        if (bu->ranged_type == RAT_THROWN             /* com1:0x8F1AE */
            || RAT_CLASS(bu->ranged_type) <= RAT_CLASS_MISSILE) /* com1:0x8F1C0 */
            bu->ranged_tohit += 1;                    /* com1:0x8F1C8 */
        if (bu->Weapon_Plus1 == 0)                    /* com1:0x8F1CC */
            bu->Weapon_Plus1 = 1;                     /* com1:0x8F1D3 */
    }

    if ((bu->Abilities & UA_FANTASTIC) || bu->race >= RACE_FIRST_FANTASTIC) { /* com1:0x8F1DB, com1:0x8F1E6 */
        if (bu->Weapon_Plus1 == 0)                    /* com1:0x8F1F0 */
            bu->Weapon_Plus1 = 1;                     /* com1:0x8F1FA */
    }

    /* to-hit normalisation, same unguarded `-1` entry as CP 1.60 */
    {
        int8_t common = bu->melee_tohit;              /* com1:0x8F1FF */
        if (bu->ranged_type != RAT_NONE) {            /* com1:0x8F203, je com1:0x8F208 -> 0x8F21C */
            if (common > bu->ranged_tohit)            /* com1:0x8F20A */
                common = bu->ranged_tohit;            /* com1:0x8F210 */
            if (common <= 0)                          /* com1:0x8F214, jle com1:0x8F216 -> 0x8F224 */
                goto no_shift;
            bu->ranged_tohit -= common;               /* com1:0x8F218 */
        }
        bu->melee_tohit -= common;                    /* com1:0x8F21C */
        bu->tohit       += common;                    /* com1:0x8F220 */
    no_shift:
        if (bu->ranged_type == RAT_NONE)              /* com1:0x8F224 */
            bu->ranged_tohit = 0;                     /* com1:0x8F22B */
    }
    return;                                           /* retf com1:0x8F232 */
#endif
}


/* ===========================================================================================
 * BU_Apply_Hero_Items(si, bu)                                                        [R6.1e]
 *
 * Applies the three equipped hero items. The adjacent helpers at 0x8E039 and 0x8E4C4 are real
 * routines outside this item's assigned extent. The returned item-enchantment dword is in
 * DX:AX and is discarded by the constructor.
 * =========================================================================================== */
uint32_t __far BU_Apply_Hero_Items(int16_t si, struct s_BATTLE_UNIT __far *bu)
{
    int16_t owner, hero_slot, item, slot;

    bu->item_enchantments = 0;                    /* 131:0x8DBDB/0x8DBE1  160:=  com1:= */
    bu->melee_attack_attributes = 0;              /* 131:0x8DBEA  160:=  com1:= */
    bu->ranged_attack_attributes = 0;             /* 131:0x8DBF3  160:=  com1:= */
    owner = (int8_t)_UNITS[si].owner_idx;         /* 131:0x8DC06..0x8DC0B  160:=  com1:= */
    hero_slot = (int8_t)_UNITS[si].Hero_Slot;     /* 131:0x8DC1B..0x8DC20  160:=  com1:= */
    if (hero_slot == HERO_SLOT_NONE)              /* 131:0x8DC23/0x8DC27 ->0x8DC30  160:=
                                                     com1:0x8DC23/0x8DC27 ->0x8DC30 */
        return 0UL;                               /* 0x8DC29..0x8DC2D ->0x8E033 */

    for (slot = 0; slot < 3; slot++) {            /* 0x8DC3A..0x8DC3F; 0x8E00E ->0x8E013 */
        item = players[owner].Heroes[hero_slot].Items[slot]; /* 0x8DC3F..0x8DC7D */
        if (item == ITEM_SLOT_EMPTY)              /* 131:0x8DC59/0x8DC5E ->0x8DC63  160:=
                                                     com1:0x8DC59/0x8DC5E ->0x8DC63 */
            continue;                             /* 0x8DC60 ->0x8E00A */
        BU_Apply_Item_Powers(item, bu);           /* call 131:0x8DC8A ->0x8E039  160:=
                                                     com1:0x8DC8A ->0x8E039 */

        if (_ITEMS[item].type == it_Shield)       /* 131:0x8DC9D/0x8DCA2 ->0x8DCB5  160:=
                                                     com1:0x8DC9D/0x8DCA2 ->0x8DCB5 */
            bu->Abilities |= UA_LARGESHIELD;      /* 0x8DCB1 */
        if ((uint8_t)bu->mana_max > 0)            /* 131:0x8DCB8/0x8DCBD ->0x8DCD7  160:=
                                                     com1:0x8DCB8/0x8DCBD ->0x8DCD7 */
            bu->mana_max += _ITEMS[item].spell_skill; /* 0x8DCD3 */
        bu->defense += _ITEMS[item].defense;      /* 0x8DCEB */

#if BUILD == MOM131
        bu->Gold_Defense += _ITEMS[item].defense;    /* 131:0x8DD03 */
        bu->movement_points += _ITEMS[item].moves2;  /* 131:0x8DD1B */
        bu->resist += _ITEMS[item].resistance;       /* 131:0x8DD33 */
        bu->Gold_Resist += _ITEMS[item].resistance;  /* 131:0x8DD4B */
#else
        {   uint8_t move_bits = 0;                    /* 160:0x8DD00  com1:= */
            uint8_t resistance;
            uint16_t powers_hi;
            bu->Gold_Defense += _ITEMS[item].defense; /* 160:0x8DCEF  com1:= */
            if (_ITEMS[item].Powers & IP_MERGING)     /* 0x8DD02; je 0x8DD08 ->0x8DD0D */
                move_bits |= MV_MERGING;              /* 0x8DD0A */
            resistance = _ITEMS[item].resistance;     /* 0x8DD0D */
#if BUILD == COM1
            if (_ITEMS[item].Powers & IP_COM1_TELEPORTATION)
                                                    /* com1:0x8DD11; je 0x8DD17 ->0x8DD1C */
                move_bits |= MV_TELEPORT;             /* com1:0x8DD19 */
#else
            /* 160:0x8DD11 `26 F7 47 2E 00 20`; 0x8DD17 `EB 03` makes 0x8DD19 dead. */
#endif
            powers_hi = IP_HIGH_WORD(_ITEMS[item].Powers); /* push 0x8DD20 */
#if BUILD == CP160
            bu->movement_points += _ITEMS[item].moves2; /* 160:0x8DD27 */
#else
            /* com1:0x8DD27..0x8DD2B is four NOP bytes. */
#endif
            *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) |= move_bits; /* 0x8DD2B */
            bu->resist += resistance;                    /* 0x8DD2F */
            bu->Gold_Resist += resistance;               /* 0x8DD33 */
#if BUILD == COM1
            if (powers_hi & IP_HIGH_WORD(IP_COM1_INNER_FIRE)) {
                                                        /* 0x8DD38; je 0x8DD3C ->0x8DD49 */
                *((uint8_t far *)bu + BU_OFF_ATTRIBS_1_LO) |=
                    USA_IMMUNITY_FIRE | USA_IMMUNITY_COLD; /* raw 0x11; 0x8DD3E */
                bu->Attribs_2 |= USA2_IMMOLATION;       /* emitted as unaligned word OR 0x0800;
                                                           Attribs_2 |= 0x08; 0x8DD43 */
            }
            if (powers_hi & IP_HIGH_WORD(IP_COM1_DIVINE_PROTECTION)) {
                                                        /* 0x8DD49; je 0x8DD4D ->0x8DD59 */
                *((uint8_t far *)bu + BU_OFF_ATTRIBS_1_LO) |= USA_IMMUNITY_DEATH; /* 0x8DD4F */
                bu->Attribs_1 |= USA_LUCKY;             /* emitted as unaligned word OR 0x0004;
                                                           0x8DD54 */
            }
#else
            /* 160:0x8DD38 `F7 C1 00 08; EB 0B` and 0x8DD49 `F7 C1 00 01; EB 0A`:
               both candidate write blocks are unreachable. */
#endif
        }
#endif

        if (_ITEMS[item].type <= it_Axe || _ITEMS[item].type == it_Misc) {
            /* 131:0x8DD61/0x8DD75 ->0x8DD7A; 0x8DD77 ->0x8DE5A.
               160:0x8DD7A/0x8DD82 ->0x8DD87; 0x8DD84 ->0x8DE5A.
               com1:0x8DD7A/0x8DD82 ->0x8DD87; 0x8DD84 ->0x8DE5A. */
            bu->melee += _ITEMS[item].attack;           /* 0x8DD8E */
            bu->Gold_Melee += _ITEMS[item].attack;      /* 0x8DDA5 */
            bu->melee_tohit += _ITEMS[item].tohit;      /* 0x8DDBD */
            if (_ITEMS[item].Powers & IP_FLAMING) {
                /* 131:0x8DDCE/0x8DDDE `jl` dead; live 0x8DDE0 `jg` ->0x8DDE6;
                   0x8DDE4 ->0x8DE04. 160:=
                   com1:0x8DDCE/0x8DDDE ->0x8DE04; 0x8DDE0 ->0x8DDE6; 0x8DDE4 ->0x8DE04. */
                bu->melee += 3;                         /* 131:0x8DDE9/0x8DDF1  160:=
                                                           com1:0x8DDE9/0x8DDF1 */
                bu->Gold_Melee += 3;                    /* 0x8DE00 */
            }
#if BUILD == MOM131 || BUILD == CP160
            if (_ITEMS[item].Powers & IP_GIANT_STRENGTH) {
                /* 0x8DE21 `jl` dead; live 0x8DE23 `jg` ->0x8DE29; 0x8DE27 ->0x8DE47. */
                bu->melee++;                            /* 0x8DE34 */
                bu->Gold_Melee++;                       /* 0x8DE43 */
            }
#else
            /* com1:0x8DE04..0x8DE47 is 67 NOP bytes. R6.1g confirms that the adjacent
               item-power helper also does not test Inner Fire's raw 0x08000000 bit. */
#endif
            BU_Apply_Item_Attack_Specials(&bu->melee_attack_attributes, item);
                                                        /* call 131:0x8DE54 ->0x8E4C4  160:=
                                                           com1:0x8DE54 ->0x8E4C4 */
        }

        {   int16_t group = (int8_t)bu->ranged_type / 10;
            int eligible = 0;
#if BUILD == COM1
            if (_ITEMS[item].type == it_Bow && group <= RAT_CLASS_MAGIC)
                eligible = 1;                          /* 0x8DE7C cmp 3; 0x8DE7F jg ->0x8DE84 */
#else
            if (_ITEMS[item].type == it_Bow && group == RAT_CLASS_MISSILE)
                eligible = 1;                          /* 0x8DE7C cmp 2; 0x8DE7F jne ->0x8DE84 */
#endif
            else if (_ITEMS[item].type == it_Staff && group == RAT_CLASS_MAGIC)
                eligible = 1;                          /* 0x8DE96 ->0x8DEAB; 0x8DEA9 ->0x8DF07 */
            else if (_ITEMS[item].type == it_Wand && group == RAT_CLASS_MAGIC)
                eligible = 1;                          /* 0x8DEBD ->0x8DED2; 0x8DED0 ->0x8DF07 */
            else if (_ITEMS[item].type == it_Axe && bu->ranged_type == RAT_THROWN)
                eligible = 1;                          /* 0x8DEE4 ->0x8DEF0; 0x8DEEE ->0x8DF07 */
            else if (_ITEMS[item].type == it_Misc)
                eligible = 1;                          /* 0x8DF02 ->0x8DF07; reject 0x8DF04 ->0x8E00A */
            if (eligible) {
                bu->ranged += _ITEMS[item].attack;      /* 0x8DF1B */
                bu->Gold_Ranged += _ITEMS[item].attack; /* 0x8DF33 */
                bu->ranged_tohit += _ITEMS[item].tohit; /* 0x8DF4B */
                if (_ITEMS[item].Powers & IP_FLAMING) {
                    /* 131:0x8DF6C `jl` dead; live 0x8DF6E `jg` ->0x8DF74;
                       0x8DF72 ->0x8DF94. 160:=
                       com1:0x8DF6C ->0x8DF94; 0x8DF6E ->0x8DF74; 0x8DF72 ->0x8DF94. */
                    bu->ranged += 3;                    /* 131:0x8DF77/0x8DF80  160:=
                                                           com1:0x8DF77/0x8DF80 */
                    bu->Gold_Ranged += 3;               /* 0x8DF90 */
                }
#if BUILD == MOM131 || BUILD == CP160
                if ((_ITEMS[item].Powers & IP_GIANT_STRENGTH)
                    && _ITEMS[item].type == it_Axe && bu->ranged_type == RAT_THROWN) {
                    /* 0x8DFB1 `jl` dead; live 0x8DFB3 `jg` ->0x8DFB9;
                       0x8DFCB/0x8DFD5 reject to 0x8DFF7. */
                    bu->ranged++;                       /* 0x8DFE3 */
                    bu->Gold_Ranged++;                  /* 0x8DFF3 */
                }
#else
                /* com1:0x8DF94..0x8DFF7 is 99 NOP bytes. */
#endif
                BU_Apply_Item_Attack_Specials(&bu->ranged_attack_attributes, item);
                                                        /* call 131:0x8E004 ->0x8E4C4  160:=
                                                           com1:0x8E004 ->0x8E4C4 */
            }
        }
    }
    return bu->item_enchantments;                       /* 0x8E013..0x8E030 */
}                                                       /* retf 0x8E038 */

/* ===========================================================================================
 * BU_Apply_Item_Powers(item, bu)                                                  [R6.1g]
 *
 * Converts twenty item-power bits into battle-unit item enchantments. MoM 1.31 and CP 1.60
 * are byte-identical. CoM 1 repurposes three inputs: Path Finding becomes Land Link, Magic
 * Immunity writes a movement flag, and Righteousness/Shadow conditionally grants Thrown.
 * =========================================================================================== */
void __far BU_Apply_Item_Powers(int16_t item, struct s_BATTLE_UNIT __far *bu)
{
    uint32_t acc = 0UL;                       /* 131:0x8E042/0x8E047  160:=  com1:= */

    if (_ITEMS[item].Powers & IP_CLOAK_OF_FEAR)      /* 131:0x8E064  160:=  com1:0x8E061 */
        acc |= UE_CLOAK_OF_FEAR;                      /* 131:0x8E077  160:=  com1:0x8E06B */
    if (_ITEMS[item].Powers & IP_WRAITH_FORM)         /* 131:0x8E098  160:=  com1:0x8E082 */
        acc |= UE_WRAITH_FORM;                        /* 131:0x8E0AE  160:=  com1:0x8E089 */
    if (_ITEMS[item].Powers & IP_REGENERATION)        /* 131:0x8E0CF  160:=  com1:0x8E0A2 */
        acc |= UE_REGENERATION;                       /* 131:0x8E0E5  160:=  com1:0x8E0B8 */

    if (_ITEMS[item].Powers & IP_PATHFINDING) {       /* 131:0x8E106  160:=  com1:0x8E0D9 */
#if BUILD == COM1
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) |= MV_LAND_LINK;
                                                      /* raw 0x60; com1:0x8E0ED */
        acc |= UE_LAND_LINK;                          /* com1:0x8E0F2 */
        /* com1:0x8E0F7..0x8E0FC: six NOP padding bytes. */
#else
        acc |= UE_PATH_FINDING;                       /* 131:0x8E11D  160:= */
#endif
    }

    if (_ITEMS[item].Powers & IP_WATER_WALKING)       /* 131:0x8E13F  160:=  com1:0x8E112 */
        acc |= UE_WATER_WALKING;                      /* 131:0x8E156  160:=  com1:0x8E129 */
    if (_ITEMS[item].Powers & IP_RESIST_ELEMENTS)     /* 131:0x8E178  160:=  com1:0x8E14B */
        acc |= UE_RESIST_ELEMENTS;                    /* 131:0x8E18F  160:=  com1:0x8E162 */
    if (_ITEMS[item].Powers & IP_ELEMENTAL_ARMOR)     /* 131:0x8E1B1  160:=  com1:0x8E184 */
        acc |= UE_ELEMENTAL_ARMOR;                    /* 131:0x8E1C8  160:=  com1:0x8E19B */
    if (_ITEMS[item].Powers & IP_ENDURANCE)           /* 131:0x8E1EA  160:=  com1:0x8E1BD */
        acc |= UE_ENDURANCE;                          /* 131:0x8E201  160:=  com1:0x8E1D4 */
    if (_ITEMS[item].Powers & IP_INVISIBILITY)        /* 131:0x8E223  160:=  com1:0x8E1F6 */
        acc |= UE_INVISIBILITY;                       /* 131:0x8E23A  160:=  com1:0x8E20D */
    if (_ITEMS[item].Powers & IP_FLIGHT)              /* 131:0x8E25C  160:=  com1:0x8E22F */
        acc |= UE_FLIGHT;                             /* 131:0x8E272  160:=  com1:0x8E245 */
    if (_ITEMS[item].Powers & IP_RESIST_MAGIC)        /* 131:0x8E293  160:=  com1:0x8E266 */
        acc |= UE_RESIST_MAGIC;                       /* 131:0x8E2A9  160:=  com1:0x8E27C */
    if (_ITEMS[item].Powers & IP_GUARDIAN_WIND)       /* 131:0x8E2CA  160:=  com1:0x8E29D */
        acc |= UE_GUARDIAN_WIND;                      /* 131:0x8E2E0  160:=  com1:0x8E2B3 */

    if (_ITEMS[item].Powers & IP_MAGIC_IMMUNITY) {    /* 131:0x8E301  160:=  com1:0x8E2D4 */
#if BUILD == COM1
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_HI) |= (uint8_t)(MV_UNKNOWN_0200 >> 8);
                                                      /* raw 0x02; com1:0x8E2E7 */
        /* com1:0x8E2EC..0x8E2F5: ten NOP padding bytes. */
#else
        acc |= UE_MAGIC_IMMUNITY;                     /* 131:0x8E317  160:= */
#endif
    }

    if (_ITEMS[item].Powers & IP_TRUE_SIGHT)          /* 131:0x8E338  160:=  com1:0x8E30B */
        acc |= UE_TRUE_SIGHT;                         /* 131:0x8E34E  160:=  com1:0x8E321 */
    if (_ITEMS[item].Powers & IP_BLESS)               /* 131:0x8E36F  160:=  com1:0x8E342 */
        acc |= UE_BLESS;                              /* 131:0x8E385  160:=  com1:0x8E358 */
    if (_ITEMS[item].Powers & IP_LION_HEART)          /* 131:0x8E3A6  160:=  com1:0x8E379 */
        acc |= UE_LION_HEART;                         /* 131:0x8E3BC  160:=  com1:0x8E38F */
    if (_ITEMS[item].Powers & IP_PLANAR_TRAVEL)       /* 131:0x8E3DD  160:=  com1:0x8E3B0 */
        acc |= UE_PLANAR_TRAVEL;                      /* 131:0x8E3F3  160:=  com1:0x8E3C6 */

#if BUILD == MOM131 || BUILD == CP160
    if (_ITEMS[item].Powers & IP_RIGHTEOUSNESS)       /* 131:0x8E414  160:= */
        acc |= UE_RIGHTEOUSNESS;                      /* 131:0x8E42A  160:= */
#else
    if (_ITEMS[item].Powers & IP_COM1_SHADOW) {       /* com1:0x8E3E7; je 0x8E431 at 0x8E3EF */
        if (bu->ranged_type == RAT_THROWN             /* com1:0x8E3F4/0x8E3F9 */
            || unit_types[(uint8_t)_UNITS[bu->unit_idx].type].ranged_type == RAT_NONE) {
                                                      /* com1:0x8E41E/0x8E421 */
            bu->ranged_type = RAT_THROWN;             /* raw 0x64; com1:0x8E423 */
            bu->ranged = (int8_t)(bu->melee >> 1);    /* bare signed sar; com1:0x8E42B/0x8E42D */
        }
    }
    /* com1:0x8E431..0x8E44D: 29 NOP padding bytes. */
#endif

    if (_ITEMS[item].Powers & IP_INVULNERABILITY)     /* 131:0x8E44B  160:=  com1:0x8E45F */
        acc |= UE_INVULNERABILITY;                    /* 131:0x8E461  160:=  com1:0x8E467 */

    /* Holy Avenger's raw 0x00200000 input deliberately writes Bless 0x02000000. */
    if (_ITEMS[item].Powers & IP_HOLY_AVENGER)        /* 131:0x8E482  160:=  com1:= */
        acc |= UE_BLESS;                              /* 131:0x8E49B  160:=  com1:= */

    bu->item_enchantments |= acc;                     /* 131:0x8E4A4..0x8E4BC  160:=  com1:= */
}                                                     /* retf 131:0x8E4C3  160:=  com1:= */

/* ===========================================================================================
 * BU_Apply_Item_Attack_Specials(attrs, item)                                        [R6.1h]
 *
 * ORs nine item-power-derived flags into the caller-selected melee (+0x28) or ranged (+0x2A)
 * attack-attribute word. All three builds are byte-identical over [0x8E4C4,0x8E668).
 *
 * The raw 0x01000000 input is Power Drain in MoM and the repurposed Divine Protection slot in
 * CoM 1. Claude and Codex differed only on whether that build-specific naming belongs at this
 * statement or at a symbolic alias. The merged body uses the alias above so the one shared
 * executable statement remains one source statement; R6.1h.evidence.md marks the representation
 * disputed and Q25 retains both readings.
 * =========================================================================================== */
void __far BU_Apply_Item_Attack_Specials(uint16_t __far *attrs, int16_t item)
{
    uint16_t acc = *attrs;                         /* 131:0x8E4C8..0x8E4CE  160:=  com1:= */

    /* In each low-word block `and ax,0` makes jl/jg dead; jbe skips when the bit is absent.
       The high-word blocks make jl dead, jg the present edge and jbe the absent edge. */
    if (_ITEMS[item].Powers & IP_VAMPIRIC)         /* 131:0x8E4E6; jbe 0x8E4F4 ->0x8E4FD  160:=  com1:= */
        acc |= ATT_LIFE_STEAL;                     /* 131:0x8E4F8  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_LIGHTNING)        /* 131:0x8E512; jbe 0x8E520 ->0x8E529  160:=  com1:= */
        acc |= ATT_ARMOR_PIERCING;                 /* 131:0x8E524  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_DESTRUCTION)      /* 131:0x8E53E; jbe 0x8E54C ->0x8E555  160:=  com1:= */
        acc |= ATT_DESTRUCTION;                    /* 131:0x8E550  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_CHAOS)            /* 131:0x8E56A; jbe 0x8E579 ->0x8E582  160:=  com1:= */
        acc |= ATT_DOOM_DAMAGE;                    /* 131:0x8E57D  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_DEATH)            /* 131:0x8E59A; jg 0x8E5A1 ->0x8E5A7; jbe 0x8E5A5 ->0x8E5AE  160:=  com1:= */
        acc |= ATT_DEATH_TOUCH;                    /* 131:0x8E5A9  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_ATTACK_SPECIAL_POWER_DRAIN_INPUT)
                                                    /* 131:0x8E5C6; jg 0x8E5CD ->0x8E5D3;
                                                       jbe 0x8E5D1 ->0x8E5DA  160:=  com1:= */
        acc |= ATT_POWER_DRAIN;                    /* 131:0x8E5D5  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_HOLY_AVENGER)     /* 131:0x8E5F2; jg 0x8E5F9 ->0x8E5FF; jbe 0x8E5FD ->0x8E606  160:=  com1:= */
        acc |= ATT_DISPEL_EVIL;                    /* 131:0x8E601  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_PHANTASMAL)       /* 131:0x8E61E; jg 0x8E625 ->0x8E62B; jbe 0x8E629 ->0x8E632  160:=  com1:= */
        acc |= ATT_ILLUSIONARY;                    /* 131:0x8E62D  160:=  com1:= */
    if (_ITEMS[item].Powers & IP_STONING)          /* 131:0x8E647; jbe 0x8E656 ->0x8E65F  160:=  com1:= */
        acc |= ATT_STONING_TOUCH;                  /* 131:0x8E65A  160:=  com1:= */

    *attrs = acc;                                  /* 131:0x8E65F/0x8E662  160:=  com1:= */
}                                                  /* retf 131:0x8E667  160:=  com1:= */

/* CoM embeds a nine-byte table at 0x8DD5B..0x8DD64: `0A 0D 11 15 1C 24 2C 37 42`.
   Code jumps over it at 0x8DD59, but com1:0x8EC12 reads `2E 8A 85 8B 01`,
   `mov al,cs:[di+0x018B]`; overlay base 0x8DBD0 + 0x018B = 0x8DD5B. */

/* ===========================================================================================
 * BU_HitPoints(si)                                                                  [R6.1e]
 *
 * Returns hits in AX. CP 1.60 and CoM 1 also return the gold-hit contribution in DX; their
 * callers store AL and DL. CoM's two near helpers are represented inline.
 * =========================================================================================== */
#if BUILD == MOM131
int16_t __far BU_HitPoints(int16_t si)
#else
uint32_t __far BU_HitPoints(int16_t si)
#endif
{
    int16_t level, hits, gold_hits = 0;
    int16_t hero_slot, owner, type;
#if BUILD == COM1
    level = (int8_t)_UNITS[si].Level;                    /* call 0x8E670 ->0x8E6C1; 0x8E673 */
#else
    level = (int8_t)_UNITS[si].Level;                    /* 0x8E67D */
    if ((_UNITS[si].enchantments & UE_HEROISM) && level < 3)
                                                        /* 0x8E6A2/0x8E6A8 ->0x8E6AF */
        level = 3;                                      /* 0x8E6AA */
#endif
    hits = (int8_t)unit_types[_UNITS[si].type].Hits;     /* 131/160:0x8E6BC..0x8E6CE;
                                                           com1:0x8E67C..0x8E68E */
#if BUILD == MOM131
    if (_UNITS[si].enchantments & UE_BLACK_CHANNELS)     /* 0x8E6ED ->0x8E6F0 */
        hits++;                                          /* 0x8E6EF */
    if (_UNITS[si].enchantments & UE_LION_HEART)         /* 0x8E70D ->0x8E712 */
        hits += 3;                                       /* 0x8E70F */
#elif BUILD == CP160
    if (_UNITS[si].enchantments & UE_BLACK_CHANNELS) {   /* 0x8E6EC ->0x8E6F0 */
        gold_hits++; hits++;                             /* 0x8E6EE/0x8E6EF */
    }
    if (_UNITS[si].enchantments & UE_LION_HEART) {      /* 0x8E70D ->0x8E717 */
        hits += 3; gold_hits += 3;                       /* 0x8E70F/0x8E712 */
    }
#else
    if (_UNITS[si].enchantments & UE_LION_HEART) {      /* 0x8E699 ->0x8E6CF */
        uint16_t bonus = 8u / (uint8_t)unit_types[_UNITS[si].type].Figures;
                                                        /* call com1:0x8E69B ->0x8E6A0; div 0x8E6B6 */
        hits += bonus; gold_hits += bonus;               /* 0x8E6BB/0x8E6BD */
    }
    /* Near helper 0x8E6C1..0x8E6CF computes `_UNITS + (si << 5)` and returns with `ret`. */
#endif
    hero_slot = (int8_t)_UNITS[si].Hero_Slot;
    owner = (int8_t)_UNITS[si].owner_idx;
    type = (uint8_t)_UNITS[si].type;
#if BUILD == COM1
    if (hero_slot > HERO_SLOT_NONE) {                    /* 0x8E6DC ->0x8E759 */
        hits += level;                                   /* 0x8E6DE */
        if (gold_hits == 0) {                            /* 0x8E6EA ->0x8E726 */
            uint16_t powers_hi = 0;
            int16_t item_slot;
            for (item_slot = 0; item_slot < 3; item_slot++) {
                int16_t equipped = players[owner].Heroes[hero_slot].Items[item_slot];
                if (equipped > ITEM_SLOT_EMPTY)          /* 0x8E70B ->0x8E714 */
                    powers_hi |= IP_HIGH_WORD(_ITEMS[equipped].Powers); /* 0x8E710 */
                                                        /* loop 0x8E71A ->0x8E703 */
            }
            if (powers_hi & IP_HIGH_WORD(IP_LION_HEART)) {
                                                        /* 0x8E721 ->0x8E726 */
                uint16_t bonus = 8u / (uint8_t)unit_types[_UNITS[si].type].Figures;
                                                        /* call com1:0x8E723 ->0x8E6A0 */
                hits += bonus; gold_hits += bonus;
            }
        }
        if (_HERO_DATA[owner][type].abilities & HA_CONSTITUTION)
                                                        /* 0x8E73C ->0x8E742 */
            hits += level + 1;                           /* 0x8E73E/0x8E741 */
        if (_HERO_DATA[owner][type].abilities & HA_SUPER_CONSTITUTION)
                                                        /* 0x8E745 ->0x8E757 */
            hits += ((level + 1) * 3) / 2;               /* CWD/SUB/SAR 0x8E747..0x8E755 */
                                                        /* 0x8E757 ->0x8E767 */
    } else {
        if (level > 2) hits++;                           /* 0x8E75D ->0x8E760 */
        if (level > 4) hits++;                           /* 0x8E764 ->0x8E767 */
    }
#else
    if (hero_slot > HERO_SLOT_NONE) {                    /* 0x8E724 ->0x8E729; else 0x8E726 ->0x8E7EA */
        if (level > 0) hits++;                           /* 0x8E72D ->0x8E730 */
#if BUILD == CP160
        if (gold_hits <= 1) {                            /* 0x8E73A ->0x8E779 */
            uint16_t powers_hi = 0;
            int16_t item_slot;
            for (item_slot = 0; item_slot < 3; item_slot++) {
                int16_t equipped = players[owner].Heroes[hero_slot].Items[item_slot];
                if (equipped > ITEM_SLOT_EMPTY)          /* 0x8E75B ->0x8E764 */
                    powers_hi |= IP_HIGH_WORD(_ITEMS[equipped].Powers); /* 0x8E760 */
                                                        /* loop 0x8E76A ->0x8E753 */
            }
            if (powers_hi & IP_HIGH_WORD(IP_LION_HEART)) {
                                                        /* 0x8E771 ->0x8E779 */
                gold_hits += 3; hits += 3;               /* 0x8E773/0x8E776 */
            }
        }
#endif
        if (_HERO_DATA[owner][type].abilities & HA_CONSTITUTION)
                                                        /* 131:0x8E779 ->0x8E781; 160:0x8E78E ->0x8E7C7 */
            hits += level + 1;
        if (_HERO_DATA[owner][type].abilities & HA_SUPER_CONSTITUTION)
                                                        /* 0x8E7CA ->0x8E7DC */
            hits += ((level + 1) * 3) / 2;               /* signed /2 0x8E7CC..0x8E7DA */
        if (level > 1) hits++;                           /* 0x8E7E0 ->0x8E7E3 */
        if (level > 3) hits++;                           /* 0x8E7E7 ->0x8E7EA */
    }
    if (level > 2) hits++;                               /* 0x8E7EE ->0x8E7F1 */
    if (level > 4) hits++;                               /* 0x8E7F5 ->0x8E7F8 */
    if (level > 5) hits++;                               /* 0x8E7FC ->0x8E7FF */
    if (level > 6) hits++;                               /* 0x8E803 ->0x8E806 */
    if (level > 7) hits++;                               /* 0x8E80A ->0x8E80D */
#endif
    if (players[owner].Globals[OE_CHARM_OF_LIFE] > 0) {  /* 131/160:0x8E82B ->0x8E846;
                                                           com1:0x8E785 ->0x8E7A0 */
        int16_t bonus = hits / 4;                        /* signed idiv 0x8E82D..0x8E835;
                                                           com1:0x8E787..0x8E78F */
#if BUILD == MOM131
        if (bonus < 1) bonus = 1;                        /* 0x8E83C ->0x8E843; mov 0x8E83E */
        hits += bonus;                                   /* 0x8E843 */
#else
        if (bonus < 1) bonus++;                          /* 160:0x8E83B ->0x8E840; inc 0x8E83D;
                                                           com1:0x8E795 ->0x8E79A; inc 0x8E797 */
        gold_hits += bonus;                              /* 160:0x8E840  com1:0x8E79A */
        hits += bonus;                                   /* 160:0x8E843  com1:0x8E79D */
#endif
    }
#if BUILD == MOM131
    return hits;                                         /* AX=DI 0x8E846; retf 0x8E84F */
#else
    return ((uint32_t)(uint16_t)gold_hits << 16) | (uint16_t)hits;
                                                        /* AX=DI/DX=SI: 160:0x8E846..0x8E848;
                                                           com1:0x8E7A0..0x8E7A2 */
#endif
}

/* CP 1.60's 0x8E794 `EB 31` jumps to live `A9 00 20` at 0x8E7C7. The byte-identical
   1.31 lookup residue at 0x8E796..0x8E7C7 is unreachable and no longer instruction-aligned. */

/* ===========================================================================================
 * BU_Recompute_Hit_Points(bu)                                                   [R6.1g]
 *
 * Recomputes live hit points from persistent, runtime and item enchantments. Unlike the
 * constructor helper above, this routine writes Gold_Hits directly and returns only hits.
 * =========================================================================================== */
int16_t __far BU_Recompute_Hit_Points(struct s_BATTLE_UNIT __far *bu)
{
    int16_t si = bu->unit_idx;                    /* 131:0x8E858..0x8E85F  160:=  com1:= */
    int16_t level = (int8_t)_UNITS[si].Level;     /* 131:0x8E86F..0x8E874  160:=  com1:= */
    int16_t hits, charm;
    uint32_t ench = _UNITS[si].enchantments       /* 131:0x8E884/0x8E888  160:=  com1:= */
                  | bu->enchantments              /* 131:0x8E88F/0x8E893  160:=  com1:= */
                  | bu->item_enchantments;        /* 131:0x8E89A/0x8E89E  160:=  com1:= */

    if ((ench & UE_HEROISM) && level < 3)         /* 131:0x8E8AE/0x8E8B6/0x8E8BC  160:=  com1:= */
        level = 3;                                /* 131:0x8E8BE  160:=  com1:= */

#if BUILD == MOM131
    /* Controller is sign-extended by the bare 0x98 (`cbw`) at 0x8E8CA. */
    if (players[(int8_t)bu->controller_idx].Globals[OE_CRUSADE] > 0
        && !(unit_types[(uint8_t)_UNITS[si].type].Abilities & UA_FANTASTIC))
                                                  /* 131:0x8E8C3..0x8E8F9 */
        level++;                                 /* 131:0x8E8FB */
#else
    /* 160/com1:0x8E8C3..0x8E8FD: 59 NOP bytes replacing the Crusade block. */
#endif

    hits = (int8_t)unit_types[(uint8_t)_UNITS[si].type].Hits;
                                                  /* 131:0x8E8FE..0x8E91D  160:=  com1:= */

#if BUILD == MOM131
    if (ench & UE_BLACK_CHANNELS) {               /* 131:0x8E91F/0x8E92D */
        hits++;                                   /* 131:0x8E92F */
        bu->Gold_Hits++;                          /* 131:0x8E930..0x8E93F */
    }
#elif BUILD == CP160
    if (ench & UE_BLACK_CHANNELS)                 /* 160:0x8E91F/0x8E92D */
        hits++;                                   /* 160:0x8E92F */
    /* 160:0x8E930 jumps over unreachable 1.31 residue at 0x8E932..0x8E93F. */
#else
    /* com1:0x8E91F..0x8E92F: 17 NOP bytes; no Black Channels hit bonus. */
#endif

#if BUILD == MOM131
    if (ench & UE_LION_HEART) {                   /* 131:0x8E940/0x8E94E */
        hits += 3;                                /* 131:0x8E950 */
        bu->Gold_Hits += 3;                       /* 131:0x8E953..0x8E962 */
    }
#elif BUILD == CP160
    if (ench & UE_LION_HEART) {                   /* 160:0x8E940/0x8E94E */
        hits += 3;                                /* 160:0x8E950 */
        if (bu->enchantments & UE_LION_HEART)     /* 160:0x8E956/0x8E95C */
            bu->Gold_Hits += 3;                   /* 160:0x8E95E */
    }
#else
    if (ench & UE_LION_HEART) {                   /* com1:0x8E930/0x8E93E */
        uint8_t share = (uint8_t)(8u / (uint8_t)bu->Max_Figures);
                                                  /* unsigned div; com1:0x8E943..0x8E94A */
        hits += share;                            /* com1:0x8E94C */
        if (bu->enchantments & UE_LION_HEART)     /* com1:0x8E956/0x8E95C */
            bu->Gold_Hits += share;               /* com1:0x8E95E */
    }
#endif

    if ((int8_t)_UNITS[si].Hero_Slot <= HERO_SLOT_NONE)
        goto shared_hit_thresholds;               /* 131:0x8E970/0x8E975/0x8E977  160:=  com1:= */

    if (level > 0)                                /* 131:0x8E97A/0x8E97E  160:=  com1:= */
        hits++;                                   /* 131:0x8E980  160:=  com1:= */

    if (_HERO_DATA[(int8_t)_UNITS[si].owner_idx][(uint8_t)_UNITS[si].type].abilities
        & HA_CONSTITUTION)                        /* 131:0x8E981..0x8E9CA  160:=  com1:= */
        hits += level + 1;                        /* 131:0x8E9CC..0x8E9D0  160:=  com1:= */

    if (_HERO_DATA[(int8_t)_UNITS[si].owner_idx][(uint8_t)_UNITS[si].type].abilities
        & HA_SUPER_CONSTITUTION)                  /* 131:0x8E9D2..0x8EA1B  160:=  com1:= */
        hits += ((level + 1) * 3) / 2;            /* signed cwd/sub/sar; 131:0x8EA1D..0x8EA2B */

    if (level > 1) hits++;                        /* 131:0x8EA2D/0x8EA31/0x8EA33  160:=  com1:= */
    if (level > 3) hits++;                        /* 131:0x8EA34/0x8EA38/0x8EA3A  160:=  com1:= */

shared_hit_thresholds:
    if (level > 2) hits++;                        /* 131:0x8EA3B/0x8EA3F  160:=  com1:= */
    if (level > 4) hits++;                        /* 131:0x8EA42/0x8EA46  160:=  com1:= */
    if (level > 5) hits++;                        /* 131:0x8EA49/0x8EA4D  160:=  com1:= */
    if (level > 6) hits++;                        /* 131:0x8EA50/0x8EA54  160:=  com1:= */
    if (level > 7) hits++;                        /* 131:0x8EA57/0x8EA5B  160:=  com1:= */

    if (players[(int8_t)_UNITS[si].owner_idx].Globals[OE_CHARM_OF_LIFE] > 0) {
                                                  /* 131:0x8EA5E..0x8EA7C  160:=  com1:= */
        charm = hits / 4;                         /* signed idiv; 131:0x8EA7E..0x8EA86 */
        if (charm < 1)                            /* 131:0x8EA89/0x8EA8D  160:=  com1:= */
            charm = 1;                            /* 131:0x8EA8F  160:=  com1:= */
        hits += charm;                            /* 131:0x8EA94  160:=  com1:= */
    }

    hits += (int8_t)bu->Extra_Hits;               /* 131:0x8EA97..0x8EA9F  160:=  com1:= */
    bu->Gold_Hits += (uint8_t)bu->Extra_Hits;      /* 131:0x8EAA1..0x8EAAE  160:=  com1:= */
    return hits;                                  /* 131:0x8EAAF/0x8EAB1  160:=  com1:= */
}                                                 /* retf 131:0x8EAB8  160:=  com1:= */

#if BUILD == COM1
/* Private register-contract helpers called only by Battle_Unit_Moves2. */
static struct s_BATTLE_UNIT __far *near BU_From_DI_0x9F2D4(int16_t di)
{
    return &_battle_units[di];                 /* com1:0x9F2D4..0x9F2E1 */
}

static struct s_UNIT __far *near Unit_From_BU_0x9F2E2(struct s_BATTLE_UNIT __far *bu)
{
    return &_UNITS[bu->unit_idx];              /* com1:0x9F2E2..0x9F2F0 */
}

/* CoM 1 maximum movement in half-points, including reconciliation of current movement when the
 * maximum changes. Reached through far target 0x03E0:0x003E from com1:0x90BE9. */
int16_t __far Battle_Unit_Moves2(int16_t bu_idx)
{
    struct s_BATTLE_UNIT __far *bu = BU_From_DI_0x9F2D4(bu_idx); /* call com1:0x9F138 */
    struct s_UNIT __far *u;
    uint32_t ench;
    int16_t item_moves = 0;                    /* com1:0x9F16C */
    uint8_t item_endurance = 0;                /* com1:0x9F171 */
    int16_t moves2, k;

    if (bu->Web_HP > 0)                        /* com1:0x9F13B/0x9F140 */
        return 0;                              /* com1:0x9F142 ->0x9F2CC */

    ench = bu->enchantments | bu->item_enchantments;
                                                /* com1:0x9F145..0x9F154 */
    u = Unit_From_BU_0x9F2E2(bu);               /* call com1:0x9F15B */
    ench |= u->enchantments;                    /* com1:0x9F15E..0x9F169 */

    if (ench & UE_MYSTIC_SURGE)                 /* com1:0x9F176/0x9F17A */
        item_moves += 6;                        /* +3 movement; com1:0x9F17C */

    if ((int8_t)u->Hero_Slot > HERO_SLOT_NONE) {/* com1:0x9F180/0x9F185 */
        for (k = 0; k < 3; k++) {               /* com1:0x9F1A4/0x9F1A9/0x9F1D9 */
            int16_t item = players[(int8_t)u->owner_idx].Heroes[(int8_t)u->Hero_Slot].Items[k];
                                                /* com1:0x9F187..0x9F1B2 */
            if (item <= ITEM_SLOT_EMPTY)         /* com1:0x9F1B4/0x9F1B7 */
                continue;
            /* Record indexing truncates the accepted word item index to signed byte before
               multiplying by the 50-byte stride: com1:0x9F1B9 `B8 3200`, 0x9F1BC `F6 2F`. */
            if (_ITEMS[(int8_t)item].Powers & IP_ENDURANCE)
                                                /* com1:0x9F1C4/0x9F1CA */
                item_endurance = 1;             /* com1:0x9F1CC */
            item_moves += (int8_t)_ITEMS[(int8_t)item].moves2;
                                                /* com1:0x9F1D0..0x9F1D5 */
        }
    }

    bu = BU_From_DI_0x9F2D4(bu_idx);            /* call com1:0x9F1DB */
    u = Unit_From_BU_0x9F2E2(bu);               /* call com1:0x9F1DE */
    moves2 = (int8_t)unit_types[(uint8_t)u->type].Move_Halves;
                                                /* unsigned type, signed movement; com1:0x9F1E1..0x9F1F3 */
    moves2 += item_moves;                       /* com1:0x9F1F5 */

    bu = BU_From_DI_0x9F2D4(bu_idx);            /* call com1:0x9F1F8 */
    moves2 += ((uint8_t *)COM1_LOGISTICS_MAX_ADDR)[(uint8_t)bu->controller_idx];
                                                /* Logistics table DS:0x3AC8; com1:0x9F1FB..0x9F205 */

    if (moves2 < 6 && (ench & UE_FLIGHT))        /* com1:0x9F207/0x9F20A/0x9F210 */
        moves2 = 6;                             /* com1:0x9F212 */
    if (moves2 < 4) {                           /* com1:0x9F215/0x9F218 */
        bu = BU_From_DI_0x9F2D4(bu_idx);        /* call com1:0x9F21A */
        u = Unit_From_BU_0x9F2E2(bu);           /* call com1:0x9F21D */
        if (u->mutations & UM_CHAOS_CHANNELS_WINGS) /* com1:0x9F220/0x9F225 */
            moves2 = 4;                         /* com1:0x9F227 */
    }
    if (item_endurance || (ench & UE_ENDURANCE))/* com1:0x9F22A/0x9F22E/0x9F235 */
        moves2 += 2;                            /* com1:0x9F237 */

    bu = BU_From_DI_0x9F2D4(bu_idx);            /* call com1:0x9F23A */
    if (bu->Combat_Effects & BUE_HASTE)          /* com1:0x9F23D/0x9F243 */
        moves2 <<= 1;                           /* com1:0x9F245 */

    {
        int entangled = 0;
        if (combat_enchantments[CE_ENTANGLE_SIDE_C584] != 0) {
                                                /* com1:0x9F247/0x9F250 */
            bu = BU_From_DI_0x9F2D4(bu_idx);    /* call com1:0x9F252 */
            if ((int8_t)bu->controller_idx == *(int16_t *)COM1_ENTANGLE_PLAYER_C584)
                                                /* com1:0x9F25A/0x9F25E */
                entangled = 1;
        }
        if (!entangled && combat_enchantments[CE_ENTANGLE_SIDE_C586] != 0) {
                                                /* com1:0x9F260/0x9F269 */
            bu = BU_From_DI_0x9F2D4(bu_idx);    /* call com1:0x9F26B */
            if ((int8_t)bu->controller_idx == *(int16_t *)COM1_ENTANGLE_PLAYER_C586)
                                                /* com1:0x9F273/0x9F277 */
                entangled = 1;
        }
        if (entangled) {
            bu = BU_From_DI_0x9F2D4(bu_idx);    /* call com1:0x9F279 */
            if (!(bu->Abilities & UA_NONCORPOREAL) /* com1:0x9F27C/0x9F281 */
                && !(bu->enchantments & UE_WRAITH_FORM)) /* com1:0x9F283/0x9F288 */
                moves2 -= 4;                   /* -2 movement; com1:0x9F28A */
        }
    }

    if (moves2 < 0)                             /* com1:0x9F28D/0x9F290 */
        moves2 = 0;                             /* com1:0x9F292 */

    bu = BU_From_DI_0x9F2D4(bu_idx);            /* call com1:0x9F294 */
    if ((int8_t)bu->Grey_Hits == -1) {          /* sentinel; com1:0x9F299/0x9F29E */
        bu->movement_points = (int8_t)moves2;   /* com1:0x9F2A0 */
        bu->Grey_Hits = (int8_t)moves2;         /* com1:0x9F2A4 */
        return moves2;                          /* com1:0x9F2A8 */
    }
    if ((int8_t)bu->Grey_Hits == (int8_t)moves2)/* com1:0x9F2AA/0x9F2AE */
        return moves2;                          /* equality bypasses cache write; ->0x9F2CE */
    {
        int8_t delta = (int8_t)moves2 - (int8_t)bu->Grey_Hits;
                                                /* 8-bit subtract; com1:0x9F2B0/0x9F2B1 */
        if (!(bu->Move_Flags & MV_UNKNOWN_1000)) {/* com1:0x9F2B5/0x9F2BA */
            if (bu->Move_Flags & MV_UNKNOWN_0800)/* com1:0x9F2BC/0x9F2C1 */
                delta >>= 1;                   /* bare signed sar; com1:0x9F2C3 */
            bu->movement_points += delta;      /* com1:0x9F2C5 */
        }
    }
    bu->Grey_Hits = (int8_t)moves2;             /* re-entry com1:0x9F2CA -> store 0x9F2A4 */
    return moves2;                              /* com1:0x9F2CE */
}                                               /* retf com1:0x9F2D3 */
#endif

/* ===========================================================================================
 * BU_Construct(bu) — battle-unit constructor across all three DOS builds.             [R6.1b]
 *
 * Assigned constructor extents are 0x8EDFD-0x8F310, excluding the relocated R6.1a tails at
 * mom160:0x8F197-0x8F26E and com1:0x8F15C-0x8F233. CoM 1's near helper at
 * 0x8F379-0x8F3A7 and its six-byte cs:0x17D7 table also belong to this item.
 * =========================================================================================== */

void BU_Construct(struct s_BATTLE_UNIT far *bu)
{
    int16_t si;                 /* live unit index; stack locals are called out at their writes */
    uint16_t ench_lo, ench_hi;
    uint8_t  mutations, quality, type;
    int16_t  chaos_flag;
    uint16_t di, cx;

    /* 131:0x8EE05  160:=  com1:= */
    si = bu->unit_idx;

#if BUILD == COM1
    /* 131:—  160:—  com1:0x8EE0C */
    bu->toblock = 0;            /* moved out of the zeroing run below */
#endif

    /* 131:0x8EE0C  160:=  com1:0x8EE11 */
    mutations = _UNITS[si].mutations;                    /* -> [bp-7] */

#if BUILD == COM1
    /* 131:—  160:—  com1:0x8EE28 -> 0x8EE37 when not equal */
    if (_UNITS[si].type == COM1_UT_ZOMBIES)
        /* com1:0x8EE31 */
        bu->toblock--;                                   /* == -1 here */

    /* 131:—  160:—  com1:0x8EE39 -> 0x8EE47 when not equal */
    if (_UNITS[si].type == COM1_UT_GOLEM)
        /* com1:0x8EE40 */
        bu->item_enchantments |= UE_RESIST_ELEMENTS;
#endif

    /* 131:0x8EE1F  160:=  com1:0x8EE47 */
    bu->tohit = unit_types[_UNITS[si].type].To_Hit;

    /* 131:0x8EE48  160:0x8EE48  com1:0x8EE5B */
    bu->melee_tohit = 0;
    /* 131:0x8EE53  160:0x8EE4D  com1:0x8EE60 */
    bu->ranged_tohit = 0;
#if BUILD == MOM131 || BUILD == CP160
    /* 131:0x8EE5B  160:0x8EE52  com1:— (done at 0x8EE0C) */
    bu->toblock = 0;
#endif
    /* 131:0x8EE63  160:0x8EE57  com1:0x8EE65 */
    bu->Gold_Melee = 0;
    /* 131:0x8EE6B  160:0x8EE5C  com1:0x8EE6A */
    bu->Gold_Ranged = 0;
    /* 131:0x8EE73  160:0x8EE61  com1:0x8EE6F */
    bu->Gold_Defense = 0;
    /* 131:0x8EE7B  160:0x8EE66  com1:0x8EE74 */
    bu->Gold_Resist = 0;
    /* 131:0x8EE83  160:0x8EE6B  com1:0x8EE79 */
    bu->Gold_Hits = 0;
    /* 131:0x8EE8B  160:0x8EE70  com1:0x8EE7E */
    bu->Grey_Melee = 0;
    /* 131:0x8EE93  160:0x8EE75  com1:0x8EE83 */
    bu->Grey_Ranged = 0;
    /* 131:0x8EE9B  160:0x8EE7A  com1:0x8EE88 */
    bu->Grey_Defense = 0;
    /* 131:0x8EEA3  160:0x8EE7F  com1:0x8EE8D */
    bu->Grey_Resist = 0;
    /* Grey_Hits (+0x6D) is not zeroed in any build. */

#if BUILD == COM1
    /* 131:—  160:—  com1:0x8EEA4 -> 0x8EEB4;  com1:0x8EEAD -> 0x8EEB4 */
    if (_UNITS[si].type == COM1_UT_CATAPULT && _UNITS[si].wp == COM1_CATAPULT_MAGIC_WP)
        /* com1:0x8EEAF */
        _UNITS[si].mutations = UM_MAGIC_WEAPONS; /* persistent record; [bp-7] keeps the old value,
                                          but the quality read below re-reads +0x17 */
#endif

    /* 131:0x8EEA8  160:0x8EE84  com1:0x8EE92 */
    bu->resist = unit_types[_UNITS[si].type].Resist;

#if BUILD == CP160 || BUILD == COM1
    /* 131:—  160:0x8EE90  com1:0x8EE9E — byte load before the 0x24-stride calculation. */
    type = _UNITS[si].type;

    /* Type-table attribute re-copy, absent from 1.31. Values are pushed at
       160:0x8EEB0/0x8EEB5/0x8EEBA/0x8EEBF/0x8EEC4, com1:0x8EEBE/0x8EEC3/0x8EEC8/0x8EECD/0x8EED2
       and popped in reverse, which is why the stores read bottom-up here. */
    /* 131:—  160:0x8EED8  com1:0x8EEE6 */
    bu->Attribs_2 = (bu->Attribs_2 & USA2_TYPE_IMPORT_KEEP)
                  | (unit_types[type].Attribs_2 & USA2_TYPE_IMPORT_MASK);
                                                            /* raw keep mask 0xD7 / copy mask 0x28 */
    /* 131:—  160:0x8EEE5  com1:0x8EEF3 */
    *((uint8_t far *)bu + BU_OFF_ATTRIBS_1_HI) =
        (*((uint8_t far *)bu + BU_OFF_ATTRIBS_1_HI) & (uint8_t)~USA_HIGH_BYTE(USA_IMMUNITY_WEAPON))
        | (unit_types[type].Attribs_1_hi & USA_HIGH_BYTE(USA_IMMUNITY_WEAPON));
                                                            /* raw keep mask 0xFE / copy mask 0x01 */
    /* 131:—  160:0x8EEEF  com1:0x8EEFD */
    *((uint8_t far *)bu + BU_OFF_ATTRIBS_1_LO) = unit_types[type].Attribs_1_lo;
    /* 131:—  160:0x8EEF4 (`26 88 47 1c`)  com1:0x8EF02 (`26 89 47 1c`) */
#if BUILD == CP160
    ((uint8_t far *)&bu->Abilities)[0] =
        ((uint8_t far *)&unit_types[type].Abilities)[0];   /* CP preserves the high byte */
#else
    bu->Abilities = unit_types[type].Abilities;            /* CoM copies the full word */
#endif
    /* 131:—  160:0x8EEF9  com1:0x8EF07 */
    *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) = unit_types[type].Move_Flags_lo;
#endif

    /* 131:0x8EECC  160:0x8EEFF  com1:0x8EF0D */
    bu->defense = unit_types[_UNITS[si].type].Defense;
    /* 131:0x8EEF0  160:0x8EF04  com1:0x8EF12 */
    bu->melee = unit_types[_UNITS[si].type].Melee;
    /* 131:0x8EF13  160:=  com1:0x8EF21 */
    bu->ranged = unit_types[_UNITS[si].type].Ranged;

#if BUILD == MOM131 || BUILD == CP160
    /* 131:0x8EF3A -> 0x8EF4A  160:= */
    if (bu->Attribs_1 & USA_CASTER_40)
        /* 131:0x8EF45  160:= */
        bu->mana_max = 40;
    /* 131:0x8EF4D -> 0x8EF5D  160:= */
    if (bu->Attribs_1 & USA_CASTER_20)
        /* 131:0x8EF58  160:= */
        bu->mana_max = 20;
#else
    /* com1 folds both into one unconditional store, so a unit with neither bit is
       assigned 0 rather than left alone. */
    {   uint8_t mana = 0;                                  /* com1:0x8EF45 */
        /* com1:0x8EF47 -> 0x8EF51 */
        if (bu->Attribs_1 & USA_CASTER_40) mana = 40;      /* com1:0x8EF4F */
        /* com1:0x8EF51 -> 0x8EF5B */
        if (bu->Attribs_1 & USA_CASTER_20) mana = 20;      /* com1:0x8EF59 */
        bu->mana_max = mana;                               /* com1:0x8EF5B */
    }
    /* com1:0x8EF5F — near call, no arguments, si and bp live */
    Set_Mana_Max_From_Table();
#endif

    /* 131:0x8EF66  160:=  com1:0x8EF6A — far call via `push cs` + near `call` */
    BU_Apply_Level_Bonus(si, bu);

#if BUILD == COM1
    /* CoM 1 runs the hero block BEFORE the Lucky block; the two MoM builds run it after. */
    /* com1:0x8EF7C -> 0x8EFAE */
    if (_UNITS[si].Hero_Slot > HERO_SLOT_NONE) {
        /* com1:0x8EF86 -> 0x8EF92 */
        if (bu->Weapon_Plus1 == 0)
            bu->Weapon_Plus1 = 1;                          /* com1:0x8EF8D */
        BU_Apply_Hero_Abilities(si, bu);                    /* com1:0x8EF9A */
        BU_Apply_Hero_Items(si, bu);                       /* com1:0x8EFA8 */
    }
#endif

    /* 131:0x8EF6F -> 0x8EFB7   160:=   com1:0x8EFB1 -> 0x8EFE1 */
    if (bu->Attribs_1 & USA_LUCKY) {
        /* 131:0x8EF7A  160:=  com1:0x8EFB9 */
        bu->tohit++;
        /* 131:0x8EF8A  160:=  com1:0x8EFC3 */
        bu->toblock++;
        /* 131:0x8EF9A  160:=  com1:0x8EFCD */
        bu->resist++;
        /* 131:0x8EFAA  160:=  com1:0x8EFD7 */
        bu->Gold_Resist++;                                 /* no Gold twin for tohit/toblock */
    }

#if BUILD == MOM131 || BUILD == CP160
    /* 131:0x8EFC3 -> 0x8EFF9  160:= — signed byte compare against -1 */
    if (_UNITS[si].Hero_Slot > HERO_SLOT_NONE) {
        /* 131:0x8EFCD -> 0x8EFDC  160:= */
        if (bu->Weapon_Plus1 == 0)
            bu->Weapon_Plus1 = 1;                          /* 131:0x8EFD7  160:= */
        BU_Apply_Hero_Abilities(si, bu);                    /* 131:0x8EFE5  160:= */
        BU_Apply_Hero_Items(si, bu);                       /* 131:0x8EFF3  160:= */
    }
#endif

#if BUILD == COM1
    /* 131:—  160:—  com1:0x8EFFA */
    bu->item_enchantments &= ~UE_LAND_LINK;                /* raw 0xFFFFFF7F; strip Land Link */
#endif
    /* 131:0x8F005  160:0x8F007  com1:0x8EFEF */
    ench_lo = _UNITS[si].enchantments_lo | bu->item_enchantments_lo;   /* -> [bp-6] */
    ench_hi = _UNITS[si].enchantments_hi | bu->item_enchantments_hi;   /* -> [bp-4] */

#if BUILD == CP160
    /* Two CP 1.60 additions on the merged value. The first is dead: 0x8F020 sets flags
       and 0x8F023 is an unconditional `EB 04`, so the `inc` at 0x8F025 is unreachable
       residue of a `jz`-shaped original. */
    /* 160:0x8F020, jmp at 0x8F023 -> 0x8F029; 0x8F025 unreachable */
    /* if (ench_lo & UE_LOW_WORD(UE_ENDURANCE)) bu->toblock++;  -- NOT EXECUTED */
    /* 160:0x8F02D -> 0x8F039 */
    if (ench_lo & UE_LOW_WORD(UE_INVISIBILITY))
        /* 160:0x8F034 */
        bu->Abilities |= UA_INVISIBILITY;
#endif

    /* 131:0x8F02A  160:0x8F03D  com1:0x8F024 — re-read from the record, not [bp-7] */
    quality = _UNITS[si].mutations & UM_WEAPON_QUALITY_MASK; /* raw mask 0x03; -> [bp-0xA] */
    /* 131:0x8F035 jg 0x8F03E else jmp 0x8F113
       160:0x8F048 jg 0x8F050 else jmp 0x8F113
       com1:0x8F02F jg 0x8F037 else jmp 0x8F0D6 */
    if (quality > 0) {
        /* 131:0x8F041 -> 0x8F07B   160:0x8F053 -> 0x8F08D   com1:0x8F03A -> 0x8F062 */
        if (bu->melee > 0) {
            /* 131:0x8F055  160:0x8F067  com1:0x8F048 */
            bu->melee += quality - 1;
            /* 131:0x8F067  160:0x8F079  com1:0x8F054 */
            bu->Gold_Melee += quality - 1;
            /* 131:0x8F077  160:0x8F089  com1:0x8F05E */
            bu->melee_tohit++;
        }
        /* Ranged gate: three tests, any hit falls into the body.
           131:0x8F089 je 0x8F0AB / 0x8F09C je 0x8F0AB / 0x8F0A4 jne 0x8F0E1
           160:0x8F09B je 0x8F0BD / 0x8F0AE je 0x8F0BD / 0x8F0B6 jne 0x8F0F0
           com1:0x8F070 je 0x8F092 / 0x8F083 je 0x8F092 / 0x8F08B jne 0x8F0B3 */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE
            || RAT_CLASS(bu->ranged_type) == RAT_CLASS_BOULDER
            || bu->ranged_type == RAT_THROWN)
        {
#if BUILD == COM1
            /* 131:—  160:—  com1:0x8F095 -> 0x8F0B3 */
            if (!(ench_lo & UE_LOW_WORD(UE_FOCUS_MAGIC)))
#endif
            {
                /* 131:0x8F0BA  160:0x8F0CC  com1:0x8F0A1 */
                bu->ranged += quality - 1;
                /* 131:0x8F0CD  160:0x8F0DF  com1:0x8F0A5 */
                bu->Gold_Ranged += quality - 1;
                /* 131:0x8F0DD  160:0x8F0EC  com1:0x8F0AF */
                bu->ranged_tohit++;
            }
        }
        /* 131:0x8F0F0  160:0x8F0F9  com1:0x8F0BC */
        bu->defense += quality - 1;
        /* 131:0x8F103  160:0x8F106  com1:0x8F0C9 */
        bu->Gold_Defense += quality - 1;
        /* 131:0x8F10F  160:0x8F10F  com1:0x8F0D2 */
        bu->Weapon_Plus1 = quality + 1;
    }

#if BUILD == COM1
    /* CoM 1 calls BU_Apply_Specials here, BEFORE Chaos Surge. */
    /* com1:0x8F0E8 */
    BU_Apply_Specials(bu, ench_lo, ench_hi, mutations);
#endif

    /* ---- Chaos Surge ---- */
#if BUILD == MOM131
    /* 131:0x8F113 */
    chaos_flag = 0;
    /* 131:0x8F118, loop head at 0x8F129, back-edge 0x8F12D jl 0x8F11C */
    for (di = 0; di < num_players; di++)
        /* 131:0x8F11C — the address carries no `di` term */
        if (*(uint8_t far *)PLAYER0_CHAOS_SURGE_ADDR > 0)
            chaos_flag = 1;                                /* 131:0x8F123 */
    /* 131:0x8F12F -> 0x8F190 */
    if (chaos_flag == 1
        /* 131:0x8F138 -> 0x8F190 */
        && bu->race == rt_Chaos) {
        /* 131:0x8F142 -> 0x8F169 */
        if (bu->ranged > 0) {
            bu->ranged += 2;                               /* 131:0x8F155 */
            bu->Gold_Ranged += 2;                          /* 131:0x8F165 */
        }
        /* 131:0x8F16C -> 0x8F190 */
        if (bu->melee > 0) {
            bu->melee += 2;                                /* 131:0x8F17D */
            bu->Gold_Melee += 2;                           /* 131:0x8F18C */
        }
    }
#elif BUILD == CP160
    /* Same shape, but the loop body is relocated to 0x8F177 and does index by di.
       0x8F11C's `cmp byte [0xA356],0` survives as dead residue: 0x8F121 is `EB 54`,
       an unconditional jmp, so its flags are never consumed, and the `mov word
       [bp-2],1` at 0x8F123 is unreachable — the relocated body writes the byte
       form at 0x8F185 instead. */
    /* 160:0x8F113 */
    chaos_flag = 0;
    /* 160:0x8F118, head 0x8F129, back-edge 0x8F12D jl 0x8F11C, body 0x8F177, jmp back 0x8F189 */
    for (di = 0; di < num_players; di++)
        /* 160:0x8F177 computes bx = di * 0x4C8;  0x8F17E -> 0x8F189 */
        if (players[di].chaos_surge > 0)                   /* [bx-0x5CAA] */
            chaos_flag = 1;                                /* 160:0x8F185 */
    /* 160:0x8F12F -> 0x8F190 */
    if (chaos_flag == 1
        /* 160:0x8F138 -> 0x8F190 */
        && bu->race == rt_Chaos) {
        /* 160:0x8F142 -> 0x8F15D */
        if (bu->ranged > 0) {
            bu->ranged += 2;                               /* 160:0x8F14F */
            bu->Gold_Ranged += 2;                          /* 160:0x8F159 */
        }
        /* 160:0x8F15D -> 0x8F175 */
        if (bu->melee > 0) {
            bu->melee += 2;                                /* 160:0x8F168 */
            bu->Gold_Melee += 2;                           /* 160:0x8F171 */
        }
    }
    /* 160:0x8F194 — jump over R6.1a's relocated BU_Apply_Specials tail */
#else  /* COM1 — counts holders instead of testing a boolean, and adds resistance */
    /* com1:0x8F0EE */
    cx = 0;
    /* com1:0x8F0F0, head/back-edge 0x8F102 / 0x8F106 jl 0x8F0F2 */
    for (di = 0; di < num_players; di++)
        /* com1:0x8F0F9 -> 0x8F101 */
        if (players[di].chaos_surge > 0)
            cx++;                                          /* com1:0x8F100 */
    /* com1:0x8F108 -> 0x8F142 */
    if (cx != 0) {
        cx++;                                              /* com1:0x8F10C */
        /* com1:0x8F110 -> 0x8F142 */
        if (bu->race == rt_Chaos) {
            /* com1:0x8F117 -> 0x8F126 */
            if (bu->ranged > 0) {
                bu->ranged += cx;                          /* com1:0x8F11E */
                bu->Gold_Ranged += cx;                     /* com1:0x8F122 */
            }
            /* com1:0x8F126 -> 0x8F13A */
            if (bu->melee > 0) {
                bu->melee += cx;                           /* com1:0x8F12C */
                bu->Gold_Melee += cx;                      /* com1:0x8F12F */
                bu->melee++;                               /* com1:0x8F133 */
                bu->Gold_Melee++;                          /* com1:0x8F136 */
            }
            bu->resist += cx;                              /* com1:0x8F13A — ungated */
            bu->Gold_Resist += cx;                         /* com1:0x8F13E */
        }
    }
    /* com1:0x8F159 — jump over R6.1a's relocated BU_Apply_Specials tail */
#endif

#if BUILD == MOM131
    /* ---- Holy Arms / Holy Weapon, inline in 1.31 only ----
       CP 1.60 and CoM 1 moved this into BU_Apply_Specials (R6.1a). No build has a
       to-hit normalisation here: 1.31 writes +0x24/+0x25 only as increments, and
       never writes +0x04 after 0x8EF83. */
    /* 131:0x8F1A8 -> 0x8F1C0 */
    if (players[_UNITS[si].owner_idx].holy_arms > 0        /* [bx-0x5CA1] */
        /* 131:0x8F1B2 -> 0x8F1C0 */
        && !(bu->Abilities & UA_FANTASTIC)
        /* 131:0x8F1BA -> falls through to 0x8F1C0 when set, 0x8F1BE je 0x8F1D0 */
        && !(mutations & UM_UNDEAD))
        goto grant_holy_weapon;                            /* 131:0x8F1D0 */
    /* 131:0x8F1C9, je at 0x8F1CE -> 0x8F24E */
    if (!(ench_hi & UE_HIGH_WORD(UE_HOLY_WEAPON)))
        goto magic_weapon_upgrade;                         /* 131:0x8F24E */
grant_holy_weapon:
    /* 131:0x8F1DE, stores at 0x8F1E4 / 0x8F1E8 */
    bu->enchantments |= UE_HOLY_WEAPON;
    /* 131:0x8F1EF */
    bu->melee_tohit++;
    /* 131:0x8F1FF je 0x8F22C / 0x8F214 je 0x8F22C / 0x8F227 jne 0x8F23C */
    if (bu->ranged_type == RAT_THROWN
        || RAT_CLASS(bu->ranged_type) == RAT_CLASS_BOULDER
        || RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE)
        /* 131:0x8F22F */
        bu->ranged_tohit++;
    /* 131:0x8F23F -> 0x8F24E */
    if (bu->Weapon_Plus1 == 0)
        bu->Weapon_Plus1 = 1;                              /* 131:0x8F249 */
magic_weapon_upgrade:
    /* 131:0x8F251 jne 0x8F263 ; 0x8F25C jle 0x8F275 */
    if ((bu->Abilities & UA_FANTASTIC) || bu->race >= rt_Generic) {
        /* 131:0x8F266 -> 0x8F275 */
        if (bu->Weapon_Plus1 == 0)
            bu->Weapon_Plus1 = 1;                          /* 131:0x8F270 */
    }
#endif

    /* 131:0x8F278 -> 0x8F290   160:0x8F278 -> 0x8F290   com1:0x8F250 -> 0x8F268 */
    if (bu->Abilities & UA_NONCORPOREAL)
        /* 131:0x8F28C  160:=  com1:0x8F264 */
        bu->Move_Flags |= MV_SWIMMING;

#if BUILD == MOM131 || BUILD == CP160
    /* 131:0x8F2A2  160:= */
    BU_Apply_Specials(bu, ench_lo, ench_hi, mutations);
    /* 131:0x8F2A9  160:= — far call 0x03C8:0x0043, one argument (si) */
    bu->movement_points = Sub_03C8_0043(si);               /* store 131:0x8F2B2  160:= */
#endif

#if BUILD == COM1
    /* 131:—  160:—  com1:0x8F277 -> 0x8F2A3 */
    if (players[bu->controller_idx].survival_instinct > 0  /* DS:0xA363; [bx-0x5C9D] */
        /* com1:0x8F27F -> 0x8F2A3 */
        && bu->race >= RACE_FIRST_FANTASTIC) {
        bu->resist += 2;                                   /* com1:0x8F286 */
        bu->Gold_Resist += 2;                              /* com1:0x8F28B */
        bu->tohit += 1;                                    /* com1:0x8F290 — no Gold twin */
        bu->defense += 1;                                  /* com1:0x8F299 */
        bu->Gold_Defense += 1;                             /* com1:0x8F29E */
    }
    /* com1:0x8F2A3 — near call, no arguments pushed; replaces MoM's 0x03C8:0x0043
       far call, and CoM 1 has no `.movement_points` store in this routine at all. */
    Eternal_Night_Penalty_0x90B11();
    /* com1:0x8F2A8 jumps over four zero bytes at 0x8F2AA..0x8F2AD */
#endif

    /* Recompute of the merged enchantments. Live in 1.31 (consumed immediately
       below) and in CoM 1 (nothing reads it afterwards). Unreachable in CP 1.60.
       131:0x8F2C2..0x8F2D8   160:0x8F2C2..0x8F2D8 (dead)   com1:0x8F2C2..0x8F2D8 */
    ench_lo = _UNITS[si].enchantments_lo | bu->item_enchantments_lo;
    ench_hi = _UNITS[si].enchantments_hi | bu->item_enchantments_hi;

#if BUILD == MOM131
    /* 131:0x8F2DE -> 0x8F2FD ; 0x8F2EE mask, je at 0x8F2F3 -> 0x8F2FD */
    if (bu->movement_points < 3 && (ench_hi & UE_HIGH_WORD(UE_FLIGHT)))
        bu->movement_points = 6;                           /* 131:0x8F2F8 */
#endif
    /* CP 1.60 keeps these bytes but cannot reach them: 0x8F2B6 is `EB 45`, an
       unconditional jmp to 0x8F2FD, and no live edge enters 0x8F2B8..0x8F2F2.
       Its surviving copy of the compare at 0x8F2DE reads `cmp ...,6`, not 3.
       CoM 1 replaced 0x8F2DB..0x8F2F8 with `nop` fill. */

    /* 131:0x8F2FF  160:0x8F2FF  com1:0x8F2FB */
#if BUILD == MOM131
    bu->hits = BU_HitPoints(si);                           /* store 131:0x8F306 */
#else
    {   uint32_t hit_result = BU_HitPoints(si);
        bu->hits = (uint8_t)hit_result;                    /* 160:0x8F2F3, via 0x8F306 jump;
                                                              com1:0x8F302 */
        bu->Gold_Hits = (uint8_t)(hit_result >> 16);       /* 160:0x8F2F7  com1:0x8F306 */
    }
#endif

    /* 131:0x8F30A  160:=  com1:= */
}


#if BUILD == COM1
/* ===========================================================================================
 * Set_Mana_Max_From_Table -- constructor-owned CoM 1 near helper.                     [R6.1b]
 *
 * A near routine (`ret`, not `retf`) lying inside CoM 1's assigned extent at 0x8F379-0x8F3A6,
 * which BU_Apply_Specials jumps over at com1:0x8F377. Its only located caller is the battle-unit
 * constructor at com1:0x8EF5F, whose `si` (unit index) and [bp+6] (battle unit) it shares.
 * Its `cs:0x17D7` table resolves to raw 0x8F3A7 in this overlay and holds three type/mana
 * pairs: Angel/24, Apprentices/14 and Djinn/35. The byte-exact segment-base derivation is in
 * R6.1b.evidence.md.
 * =========================================================================================== */
static const uint8_t mana_override_table[] = {        /* com1:0x8F3A7..0x8F3AD */
    COM1_UT_ANGEL,       24,                         /* raw B1 18 */
    COM1_UT_APPRENTICES, 14,                         /* raw 3E 0E */
    COM1_UT_DJINN,       35                          /* raw C3 23 */
};

static void Set_Mana_Max_From_Table(void)             /* com1:0x8F379 */
{
    uint8_t type = _UNITS[si].type;                   /* stride 0x20 via [0x9EC2]  com1:0x8F385 */
    for (int di = 0; di < 5; di += 2) {               /* com1:0x8F394, com1:0x8F397 */
        if (mana_override_table[di] == type) {        /* com1:0x8F38B */
            bu->mana_max = mana_override_table[di + 1]; /* com1:0x8F39A, com1:0x8F3A2 */
            return;                                   /* com1:0x8F3A6 */
        }
    }
    return;                                           /* com1:0x8F399 */
}
#endif


#if BUILD == COM1
/* 35 raw bytes read as level_table[step*7 + field] at com1:0x8FA92. Columns are BATTLE_UNIT
   byte offsets 0x00..0x06. Columns 2 (ranged_type) and 3 (ammo) are zero in every row, so the
   loop's computed-offset write never lands on them.
                                              131:—  160:—  com1:0x8FACA */
static const uint8_t com1_level_bonus_table[COM1_LEVEL_TABLE_ROWS][COM1_LEVEL_TABLE_STRIDE] = {
    /*            melee ranged rtype ammo tohit def resist  raw bytes    131:—  160:—  com1: */
    /* step 0 */ {  1,    1,     0,    0,    0,   0,   1 }, /* 01 01 00 00 00 00 01   0x8FACA */
    /* step 1 */ {  1,    1,     0,    0,    0,   1,   0 }, /* 01 01 00 00 00 01 00   0x8FAD1 */
    /* step 2 */ {  0,    0,     0,    0,    0,   1,   1 }, /* 00 00 00 00 00 01 01   0x8FAD8 */
    /* step 3 */ {  1,    1,     0,    0,    0,   1,   0 }, /* 01 01 00 00 00 01 00   0x8FADF */
    /* step 4 */ {  0,    0,     0,    0,    1,   0,   0 }, /* 00 00 00 00 01 00 00   0x8FAE6 */
};

/* 35 raw bytes jumped over by com1:0x8FB08 and read only by BU_Apply_Hero_Abilities at
   com1:0x8FE74. Indexed by _UNITS[].type; see that site for the word-versus-byte note.
                                              131:—  160:—  com1:0x8FB0A */
static const uint8_t com1_hero_mana_table[35] = {
     0,  0,  5,  0,  6, 10,  0,   /* 00 00 05 00 06 0A 00   131:—  160:—  com1:0x8FB0A */
    10,  0,  0,  5,  0,  7, 24,   /* 0A 00 00 05 00 07 18   131:—  160:—  com1:0x8FB11 */
    18,  9, 15,  0, 15, 10,  0,   /* 12 09 0F 00 0F 0A 00   131:—  160:—  com1:0x8FB18 */
     0,  0, 18,  9,  0,  5, 16,   /* 00 00 12 09 00 05 10   131:—  160:—  com1:0x8FB1F */
     0,  0,  8,  0, 10,  5, 10,   /* 00 00 08 00 0A 05 0A   131:—  160:—  com1:0x8FB26 */
};
#endif

void __far BU_Apply_Level_Bonus(int16_t unit_idx, struct s_BATTLE_UNIT __far *bu)
{
    int16_t di;                 /* unit index, kept in DI     [bp+6] */
    int16_t si;                 /* effective level, kept in SI       */
#if BUILD == COM1
    int16_t cx;                 /* Heroism floor / level step        */
    int16_t dx;                 /* BATTLE_UNIT byte-field index 0..6 */
    int16_t owner;
    uint8_t al;                 /* table cell                        */
#endif

    /* 131:0x8F886  160:=  com1:0x8F886 */
    di = unit_idx;

    /* _UNITS via far ptr [0x9EC2], stride 0x20 (`shl ax,5`), `cbw` on the byte.
       131:0x8F889, 0x8F895, 0x8F899  160:=  com1:0x8F889, 0x8F895, 0x8F899 */
    si = _UNITS[di].Level;

#if BUILD == MOM131 || BUILD == CP160
    /* The 32-bit test is emitted as `and dx,0` on the low word at +0x18 and `and ax,0x100`
       on the high word at +0x1A, i.e. mask 0x01000000.
       131:0x8F8A8, 0x8F8B0, 0x8F8B3, jump 0x8F8B8 -> 0x8F8CF  160:=  com1:— */
    if ((_UNITS[di].enchantments & UE_HEROISM)
     /* Same mask over bu->enchantments, low word +0x3A and high word +0x3C.
        131:0x8F8BA, 0x8F8C5, 0x8F8C8, jump 0x8F8CD -> 0x8F8D7  160:=  com1:— */
     || (bu->enchantments & UE_HEROISM)) {
        /* 131:0x8F8CF, jump 0x8F8D2 -> 0x8F8D7  160:=  com1:— */
        if (si < 3)
            si = 3;                     /* 131:0x8F8D4  160:=  com1:— */
    }
#endif

#if BUILD == COM1
    /* Same 0x01000000 bit, tested as one word against the high half only.
       131:—  160:—  com1:0x8F89C, jump 0x8F8A2 -> 0x8F8B3 */
    if ((_UNITS[di].enchantments & UE_HEROISM)
     /* ES:BX is stacked around the battle-unit load and restored at 0x8F8AF/0x8F8B0.
        131:—  160:—  com1:0x8F8A4, 0x8F8A9, jump 0x8F8B1 -> 0x8F8E3 */
     || (bu->enchantments & UE_HEROISM)) {
        cx = 3;                                             /* 131:—  160:—  com1:0x8F8B3 */
        /* Unsigned compare.   131:—  160:—  com1:0x8F8B6, jump 0x8F8BB -> 0x8F8DB */
        if (_UNITS[di].type < COM1_LEVEL_TYPE_CEILING) {
            /* `cbw` then owner * 0x4C8.   131:—  160:—  com1:0x8F8BD, 0x8F8C1, 0x8F8C2 */
            owner = _UNITS[di].owner_idx;
            /* [bx-0x60D1].   131:—  160:—  com1:0x8F8CA, jump 0x8F8CF -> 0x8F8D2 */
            if (players[owner].warlord > 0)
                cx++;                                       /* 131:—  160:—  com1:0x8F8D1 */
            /* [bx-0x5CA3].   131:—  160:—  com1:0x8F8D2, jump 0x8F8D7 -> 0x8F8DA */
            if (players[owner].Globals[OE_CRUSADE] > 0)
                cx++;                                       /* 131:—  160:—  com1:0x8F8D9 */
        }
        /* 131:—  160:—  com1:0x8F8DB, jump 0x8F8DD -> 0x8F8E1 */
        if (si < cx)
            si = cx;                                        /* 131:—  160:—  com1:0x8F8DF */
        /* Falls into the shared write-back through `jmp 0x8F8EC`.
           131:—  160:—  com1:0x8F8E1, 0x8F8EC, 0x8F8EE */
        _UNITS[di].Level = (int8_t)si;
    /* Unsigned compare; below the ceiling the write-back is skipped entirely.
       131:—  160:—  com1:0x8F8E3, jump 0x8F8E8 -> 0x8F8F2 */
    } else if (_UNITS[di].type >= COM1_LEVEL_TYPE_CEILING) {
        si = 0;                                             /* 131:—  160:—  com1:0x8F8EA */
        /* The same two instructions as the branch above, reached by fallthrough.
           131:—  160:—  com1:0x8F8EC, 0x8F8EE */
        _UNITS[di].Level = (int8_t)si;
    }
    /* Five `nop`, the fill left where removed code stood; executed.
       131:—  160:—  com1:0x8F8F2 */
#endif

    /* Heroes take the nine-step ladder, everything else the six-step one; Hero_Slot is -1
       for a non-hero. The `jg` takes the hero path, so the `jmp` is the normal one.
       131:0x8F8D7, 0x8F8E3, jump 0x8F8E8 -> 0x8F8ED  160:=  com1:0x8F8F7, jump 0x8F8FC -> 0x8F901 */
    if (_UNITS[di].Hero_Slot <= HERO_SLOT_NONE)
        goto normal_ladder;         /* 131:0x8F8EA jmp 0x8FA80  160:=  com1:0x8F8FE jmp 0x8FA80 */

    /* ---- hero ladder, steps 0..7 --------------------------------------------------- */

    /* 131:0x8F8ED, jump 0x8F8EF -> 0x8F91F  160:=  com1:0x8F901, jump 0x8F903 -> 0x8F933 */
    if (si > 0) {
        bu->resist++;                       /* 131:0x8F8F4  160:=  com1:0x8F908 */
        /* 131:0x8F8FB, jump 0x8F900 -> 0x8F909, write 0x8F905  160:=
           com1:0x8F90F, jump 0x8F914 -> 0x8F91D, write 0x8F919 */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8F90C, jump 0x8F910 -> 0x8F918, write 0x8F915  160:=
           com1:0x8F920, jump 0x8F924 -> 0x8F92C, write 0x8F929 */
        if (bu->melee > 0) bu->melee++;
#if BUILD == MOM131 || BUILD == CP160
        bu->defense++;                      /* 131:0x8F91B  160:=  com1:— */
#endif
        /* CoM 1 leaves a dead `les` and four `nop` where that increment stood.
           131:—  160:—  com1:0x8F92C, 0x8F92F */
    }

    /* 131:0x8F91F, jump 0x8F922 -> 0x8F952  160:=  com1:0x8F933, jump 0x8F936 -> 0x8F952 */
    if (si > 1) {
#if BUILD == MOM131 || BUILD == CP160
        bu->tohit++;                        /* 131:0x8F927  160:=  com1:— */
        bu->resist++;                       /* 131:0x8F92E  160:=  com1:— */
        /* 131:0x8F935, jump 0x8F93A -> 0x8F943, write 0x8F93F  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
#else
        /* Nop fill 0x8F93F..0x8F942.   131:—  160:—  com1:0x8F93B, 0x8F93F */
        bu->defense++;
#endif
        /* 131:0x8F946, jump 0x8F94A -> 0x8F952, write 0x8F94F  160:=
           com1:0x8F946, jump 0x8F94A -> 0x8F952, write 0x8F94F */
        if (bu->melee > 0) bu->melee++;
    }

    /* 131:0x8F952, jump 0x8F955 -> 0x8F985  160:=  com1:0x8F952, jump 0x8F955 -> 0x8F985 */
    if (si > 2) {
        bu->resist++;                       /* 131:0x8F95A  160:=  com1:0x8F95A */
        /* 131:0x8F961, jump 0x8F966 -> 0x8F96F, write 0x8F96B  160:=
           com1:0x8F961, jump 0x8F966 -> 0x8F96F, write 0x8F96B */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8F972, jump 0x8F976 -> 0x8F97E, write 0x8F97B  160:=
           com1:0x8F972, jump 0x8F976 -> 0x8F97E, write 0x8F97B */
        if (bu->melee > 0) bu->melee++;
#if BUILD == MOM131 || BUILD == CP160
        bu->defense++;                      /* 131:0x8F981  160:=  com1:— */
#endif
        /* Four `nop`.   131:—  160:—  com1:0x8F981 */
    }

    /* 131:0x8F985, jump 0x8F988 -> 0x8F9B1  160:=  com1:0x8F985, jump 0x8F988 -> 0x8F9B1 */
    if (si > 3) {
#if BUILD == MOM131 || BUILD == CP160
        bu->resist++;                       /* 131:0x8F98D  160:=  com1:— */
        /* 131:0x8F994, jump 0x8F999 -> 0x8F9A2, write 0x8F99E  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
#else
        /* Same three opcode bytes as 1.31's `resist++` with the displacement changed from
           0x06 to 0x04 at 0x8F990; nop fill 0x8F991..0x8F9A1.
           131:—  160:—  com1:0x8F98D, 0x8F991 */
        bu->tohit++;
#endif
        /* 131:0x8F9A5, jump 0x8F9A9 -> 0x8F9B1, write 0x8F9AE  160:=
           com1:0x8F9A5, jump 0x8F9A9 -> 0x8F9B1, write 0x8F9AE */
        if (bu->melee > 0) bu->melee++;
    }

    /* 131:0x8F9B1, jump 0x8F9B4 -> 0x8F9EB  160:=  com1:0x8F9B1, jump 0x8F9B4 -> 0x8F9EB */
    if (si > 4) {
#if BUILD == MOM131 || BUILD == CP160
        bu->tohit++;                        /* 131:0x8F9B9  160:=  com1:— */
#endif
        /* Dead `les` at 0x8F9B6 then four `nop`.   131:—  160:—  com1:0x8F9B9 */
        bu->resist++;                       /* 131:0x8F9C0  160:=  com1:0x8F9C0 */
        /* 131:0x8F9C7, jump 0x8F9CC -> 0x8F9D5, write 0x8F9D1  160:=
           com1:0x8F9C7, jump 0x8F9CC -> 0x8F9D5, write 0x8F9D1 */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8F9D8, jump 0x8F9DC -> 0x8F9E4, write 0x8F9E1  160:=
           com1:0x8F9D8, jump 0x8F9DC -> 0x8F9E4, write 0x8F9E1 */
        if (bu->melee > 0) bu->melee++;
#if BUILD == MOM131 || BUILD == CP160
        bu->defense++;                      /* 131:0x8F9E7  160:=  com1:— */
#endif
        /* Four `nop`.   131:—  160:—  com1:0x8F9E7 */
    }

    /* 131:0x8F9EB, jump 0x8F9EE -> 0x8FA17  160:=  com1:0x8F9EB, jump 0x8F9EE -> 0x8FA17 */
    if (si > 5) {
#if BUILD == MOM131 || BUILD == CP160
        bu->resist++;                       /* 131:0x8F9F3  160:=  com1:— */
        /* 131:0x8F9FA, jump 0x8F9FF -> 0x8FA08, write 0x8FA04  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
#else
        /* Displacement 0x06 -> 0x05 at 0x8F9F6; nop fill 0x8F9F7..0x8FA07.
           131:—  160:—  com1:0x8F9F3, 0x8F9F7 */
        bu->defense++;
#endif
        /* 131:0x8FA0B, jump 0x8FA0F -> 0x8FA17, write 0x8FA14  160:=
           com1:0x8FA0B, jump 0x8FA0F -> 0x8FA17, write 0x8FA14 */
        if (bu->melee > 0) bu->melee++;
    }

    /* 131:0x8FA17, jump 0x8FA1A -> 0x8FA4A  160:=  com1:0x8FA17, jump 0x8FA1A -> 0x8FA4A */
    if (si > 6) {
        bu->resist++;                       /* 131:0x8FA1F  160:=  com1:0x8FA1F */
        /* 131:0x8FA26, jump 0x8FA2B -> 0x8FA34, write 0x8FA30  160:=
           com1:0x8FA26, jump 0x8FA2B -> 0x8FA34, write 0x8FA30 */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8FA37, jump 0x8FA3B -> 0x8FA43, write 0x8FA40  160:=
           com1:0x8FA37, jump 0x8FA3B -> 0x8FA43, write 0x8FA40 */
        if (bu->melee > 0) bu->melee++;
#if BUILD == MOM131 || BUILD == CP160
        bu->defense++;                      /* 131:0x8FA46  160:=  com1:— */
#endif
        /* Four `nop`.   131:—  160:—  com1:0x8FA46 */
    }

    /* 131:0x8FA4A, jump 0x8FA4D -> 0x8FA7D  160:=  com1:0x8FA4A, jump 0x8FA4D -> 0x8FA7D */
    if (si > 7) {
        bu->tohit++;                        /* 131:0x8FA52  160:=  com1:0x8FA52 */
#if BUILD == MOM131 || BUILD == CP160
        bu->resist++;                       /* 131:0x8FA59  160:=  com1:— */
        /* 131:0x8FA60, jump 0x8FA65 -> 0x8FA6E, write 0x8FA6A  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
#endif
        /* Dead `les` at 0x8FA56 then 21 `nop`.   131:—  160:—  com1:0x8FA56, 0x8FA59 */
        /* 131:0x8FA71, jump 0x8FA75 -> 0x8FA7D, write 0x8FA7A  160:=
           com1:0x8FA71, jump 0x8FA75 -> 0x8FA7D, write 0x8FA7A */
        if (bu->melee > 0) bu->melee++;
    }
    goto done;      /* 131:0x8FA7D jmp 0x8FB3E  160:=  com1:0x8FA7D jmp 0x8FB3E */

    /* ---- normal ladder ------------------------------------------------------------- */
normal_ladder:

#if BUILD == MOM131 || BUILD == CP160
    /* 131:0x8FA80, jump 0x8FA82 -> 0x8FAAB  160:=  com1:— */
    if (si > 0) {
        bu->resist++;                       /* 131:0x8FA87  160:=  com1:— */
        /* 131:0x8FA8E, jump 0x8FA93 -> 0x8FA9C, write 0x8FA98  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8FA9F, jump 0x8FAA3 -> 0x8FAAB, write 0x8FAA8  160:=  com1:— */
        if (bu->melee > 0) bu->melee++;
    }
    /* 131:0x8FAAB, jump 0x8FAAE -> 0x8FABE  160:=  com1:— */
    if (si > 1) {
        bu->resist++;                       /* 131:0x8FAB3  160:=  com1:— */
        bu->defense++;                      /* 131:0x8FABA  160:=  com1:— */
    }
    /* 131:0x8FABE, jump 0x8FAC1 -> 0x8FAF1  160:=  com1:— */
    if (si > 2) {
        bu->tohit++;                        /* 131:0x8FAC6  160:=  com1:— */
        bu->resist++;                       /* 131:0x8FACD  160:=  com1:— */
        /* 131:0x8FAD4, jump 0x8FAD9 -> 0x8FAE2, write 0x8FADE  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8FAE5, jump 0x8FAE9 -> 0x8FAF1, write 0x8FAEE  160:=  com1:— */
        if (bu->melee > 0) bu->melee++;
    }
    /* 131:0x8FAF1, jump 0x8FAF4 -> 0x8FB0B  160:=  com1:— */
    if (si > 3) {
        bu->tohit++;                        /* 131:0x8FAF9  160:=  com1:— */
        bu->resist++;                       /* 131:0x8FB00  160:=  com1:— */
        bu->defense++;                      /* 131:0x8FB07  160:=  com1:— */
    }
    /* 131:0x8FB0B, jump 0x8FB0E -> 0x8FB3E  160:=  com1:— */
    if (si > 4) {
        bu->tohit++;                        /* 131:0x8FB13  160:=  com1:— */
        bu->resist++;                       /* 131:0x8FB1A  160:=  com1:— */
        /* 131:0x8FB21, jump 0x8FB26 -> 0x8FB2F, write 0x8FB2B  160:=  com1:— */
        if (bu->ranged > 0) bu->ranged++;
        /* 131:0x8FB32, jump 0x8FB36 -> 0x8FB3E, write 0x8FB3B  160:=  com1:— */
        if (bu->melee > 0) bu->melee++;
    }
#endif

#if BUILD == COM1
    /* The same six-level ladder rewritten as a table walk. `cx` is the 0-based level step,
       `dx` the BATTLE_UNIT byte-field index. The binary tests only `cx < si`; there is no
       local upper-bound check against the table's five rows.
       131:—  160:—  com1:0x8FA80, 0x8FA82, jump 0x8FA84 -> 0x8FAED, 0x8FAC7, 0x8FAC8 jmp 0x8FA82 */
    for (cx = 0; cx < si; cx++) {
        /* 131:—  160:—  com1:0x8FA86, 0x8FAC1, 0x8FAC2, jump 0x8FAC5 -> 0x8FA88 */
        for (dx = 0; dx <= 6; dx++) {
            /* cx*7 via the 8-bit `imul bl`, then + dx, then the CS-relative table read.
               131:—  160:—  com1:0x8FA88, 0x8FA8C, 0x8FA8E, 0x8FA92 */
            al = com1_level_bonus_table[cx][dx];
            /* The battle-unit far pointer is reloaded every iteration.
               131:—  160:—  com1:0x8FA97 */

            /* Ranged types at or above raw 100 take the ranged step only at cx == 1. The
               compare is signed against 100 with `jl`, so the predicate is `>= 100`: thrown,
               both breaths and all three gazes (see the ranged-type block above). The gate is
               written as the numeric predicate because it has no upper bound.
               131:—  160:—  com1:0x8FA9A, jump 0x8FA9D -> 0x8FAAB */
            if (dx == 1
             /* Signed compare against RAT_THROWN.
                131:—  160:—  com1:0x8FA9F, jump 0x8FAA4 -> 0x8FAAB */
             && bu->ranged_type >= RAT_THROWN
             /* 131:—  160:—  com1:0x8FAA6, jump 0x8FAA9 -> 0x8FAC1 */
             && cx != 1)
                continue;

            /* The write target is bu + dx, a computed byte offset.
               131:—  160:—  com1:0x8FAAB, 0x8FAAD, jump 0x8FAB0 -> 0x8FABA */
            if (dx <= 1) {
                /* 131:—  160:—  com1:0x8FAB2, jump 0x8FAB6 -> 0x8FABA */
                if (((int8_t __far *)bu)[dx] <= 0)
                    continue;               /* 131:—  160:—  com1:0x8FAB8 jmp 0x8FAC1 */
            }
            /* 131:—  160:—  com1:0x8FABA, jump 0x8FABC -> 0x8FAC1 */
            if (al == 0)
                continue;
            ((int8_t __far *)bu)[dx]++;     /* 131:—  160:—  com1:0x8FABE */
        }
    }
    /* 27 `nop` reached by com1:0x8FA84, running into the `jmp 0x8FB2D` that skips
       com1_hero_mana_table into a further 17 `nop`. All three are executed, not padding.
       131:—  160:—  com1:0x8FAED, 0x8FB08, 0x8FB2D */
#endif

done:
    return;     /* epilogue.   131:0x8FB3E, retf 0x8FB41  160:=  com1:0x8FB3E, retf 0x8FB41 */
}


/* ---------------------------------------------------------------------------------------
 * BU_Apply_Hero_Abilities(unit_idx, bu) — 0x8FB42..0x8FF09, all three builds.     [R6.1f]
 *
 * Far routine, `retf` at 0x8FF08 in all three builds. Arguments are [bp+6] = int16 unit
 * index and [bp+8] = far BATTLE_UNIT*. Called from the constructor's hero block at
 * mom131/mom160:0x8EFB7.. and com1:0x8EF70.. (R6.1b). No callees.
 *
 * Every block re-derives `_HEROES2[owner]->heroes[type]` from scratch; those eleven
 * re-derivations are the block-head addresses cited below. `owner` and `type` are read once,
 * into SI and DI, and never rewritten.
 * ------------------------------------------------------------------------------------- */

void __far BU_Apply_Hero_Abilities(int16_t unit_idx, struct s_BATTLE_UNIT __far *bu)
{
    int16_t owner;              /* SI: _UNITS[].owner_idx, sign-extended by `cbw`   */
    uint16_t type;              /* DI: _UNITS[].type, zero-extended by `mov ah,0`   */
    struct s_HERO __far *hero;  /* _HEROES2[owner]->heroes[type]                    */
    int16_t v;

    /* 131:0x8FB47, 0x8FB54, 0x8FB58  160:=  com1:0x8FB47, 0x8FB54, 0x8FB58 */
    owner = _UNITS[unit_idx].owner_idx;

    /* Zero-extended, unlike owner.
       131:0x8FB5B, 0x8FB68, 0x8FB6C  160:=  com1:0x8FB5B, 0x8FB68, 0x8FB6C */
    type = _UNITS[unit_idx].type;

    /* -- HSA_NOBLE, or the owner's Famous retort, zeroes upkeep ------------------------ */
    /* _HEROES2 at [0x9232] indexed owner*4, record stride 12 indexed by type.
       131:0x8FB70, 0x8FB76, 0x8FB7C  160:=  com1:0x8FB70, 0x8FB76, 0x8FB7C */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FB83, 0x8FB8B, 0x8FB8E, jump 0x8FB93 -> 0x8FBA5  160:=
       com1:0x8FB83, 0x8FB8B, 0x8FB8E, jump 0x8FB93 -> 0x8FBA5 */
    if ((hero->abilities & HSA_NOBLE)
     /* owner * 0x4C8, then [bx-0x60C5].
        131:0x8FB95, 0x8FB9E, jump 0x8FBA3 -> 0x8FBAD  160:=
        com1:0x8FB95, 0x8FB9E, jump 0x8FBA3 -> 0x8FBAD */
     || players[owner].famous > 0) {
        bu->upkeep = 0;     /* 131:0x8FBA5, 0x8FBA8  160:=  com1:0x8FBA5, 0x8FBA8 */
    }

    /* -- HSA_AGILITY: +1 defence per level --------------------------------------------- */
    /* 131:0x8FBAD, 0x8FBB3, 0x8FBB9  160:=  com1:0x8FBAD, 0x8FBB3, 0x8FBB9 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FBC0, 0x8FBC8, 0x8FBCB, jump 0x8FBD0 -> 0x8FBF3  160:=
       com1:0x8FBC0, 0x8FBC8, 0x8FBCB, jump 0x8FBD0 -> 0x8FBF3 */
    if (hero->abilities & HSA_AGILITY) {
        /* Level is read as a raw byte and added without sign extension.
           131:0x8FBD2, 0x8FBDF, 0x8FBE6, 0x8FBEA, write 0x8FBEF  160:=
           com1:0x8FBD2, 0x8FBDF, 0x8FBE6, 0x8FBEA, write 0x8FBEF */
        bu->defense = (int8_t)((uint8_t)_UNITS[unit_idx].Level + bu->defense + 1);
    }

    /* -- HSA_AGILITY2: +3/2 defence per level ------------------------------------------ */
    /* 131:0x8FBF3, 0x8FBF9, 0x8FBFF  160:=  com1:0x8FBF3, 0x8FBF9, 0x8FBFF */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FC06, 0x8FC0E, 0x8FC11, jump 0x8FC16 -> 0x8FC45  160:=
       com1:0x8FC06, 0x8FC0E, 0x8FC11, jump 0x8FC16 -> 0x8FC45 */
    if (hero->abilities & HSA_AGILITY2) {
        /* `cbw` at 0x8FC29.   131:0x8FC18, 0x8FC25, 0x8FC29  160:=
           com1:0x8FC18, 0x8FC25, 0x8FC29 */
        v = _UNITS[unit_idx].Level;
        /* 131:0x8FC2A, 0x8FC2B, 0x8FC2E  160:=  com1:0x8FC2A, 0x8FC2B, 0x8FC2E */
        v = (int16_t)((v + 1) * 3);
        /* `cwd`/`sub ax,dx`/`sar ax,1` — signed, truncating toward zero.
           131:0x8FC30, 0x8FC31, 0x8FC33  160:=  com1:0x8FC30, 0x8FC31, 0x8FC33 */
        v = v / 2;
        /* 131:0x8FC35, 0x8FC38, 0x8FC3C, write 0x8FC41  160:=
           com1:0x8FC35, 0x8FC38, 0x8FC3C, write 0x8FC41 */
        bu->defense = (int8_t)(bu->defense + v);
    }

    /* -- HSA_BLADEMASTER: to-hit ------------------------------------------------------- */
    /* 131:0x8FC45, 0x8FC4B, 0x8FC51  160:=  com1:0x8FC45, 0x8FC4B, 0x8FC51 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FC58, 0x8FC60, 0x8FC63, jump 0x8FC68 -> 0x8FC92  160:=
       com1:0x8FC58, 0x8FC60, 0x8FC63, jump 0x8FC68 -> 0x8FC92 */
    if (hero->abilities & HSA_BLADEMASTER) {
        /* `cbw` at 0x8FC7B, `inc ax` at 0x8FC7C.
           131:0x8FC6A, 0x8FC77, 0x8FC7B, 0x8FC7C  160:=
           com1:0x8FC6A, 0x8FC77, 0x8FC7B, 0x8FC7C */
        v = _UNITS[unit_idx].Level + 1;
#if BUILD == MOM131 || BUILD == CP160
        /* `cwd`/`sub ax,dx`/`sar ax,1`.   131:0x8FC7D, 0x8FC7E, 0x8FC80  160:=  com1:— */
        v = v / 2;
        /* 131:0x8FC82, 0x8FC85, 0x8FC89, write 0x8FC8E  160:=  com1:— */
        bu->tohit = (int8_t)(bu->tohit + v);
#else
        /* `div cl` takes the **full 16-bit AX** as its dividend — the `cbw`+`inc` result
           above, not AL — and returns the quotient in AL. It is unsigned, so a negative
           Level divides as a large unsigned value; from Level <= -2, `cbw` yields 0xFFFE
           and the quotient exceeds 0xFF, which raises the divide-error interrupt rather
           than truncating. For Level >= -1 the result equals the byte-wide reading.
           131:—  160:—  com1:0x8FC7D, 0x8FC7F */
        v = (uint16_t)v / 3u;
        /* `add byte es:[bx+4],al`, an add-to-memory where 1.31 loads and stores;
           nop fill 0x8FC88..0x8FC91.   131:—  160:—  com1:0x8FC81, write 0x8FC84, 0x8FC88 */
        bu->tohit += (int8_t)v;
#endif
    }

    /* -- HSA_BLADEMASTER2: to-hit ------------------------------------------------------ */
    /* 131:0x8FC92, 0x8FC98, 0x8FC9E  160:=  com1:0x8FC92, 0x8FC98, 0x8FC9E */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FCA5, 0x8FCAD, 0x8FCB1, jump 0x8FCB6 -> 0x8FCE6  160:=
       com1:0x8FCA5, 0x8FCAD, 0x8FCB1, jump 0x8FCB6 -> 0x8FCE6 */
    if (hero->abilities & HSA_BLADEMASTER2) {
        /* `cbw` at 0x8FCC9.   131:0x8FCB8, 0x8FCC5, 0x8FCC9, 0x8FCCA, 0x8FCCB  160:=
           com1:0x8FCB8, 0x8FCC5, 0x8FCC9, 0x8FCCA, 0x8FCCB */
        v = (int16_t)((_UNITS[unit_idx].Level + 1) * 3);
#if BUILD == MOM131 || BUILD == CP160
        /* `mov bx,4`/`cwd`/`idiv bx`.   131:0x8FCD0, 0x8FCD3, 0x8FCD4  160:=  com1:— */
        v = v / 4;
#else
        /* `mov bx,6`; the single changed byte is the immediate at 0x8FCD1.
           131:—  160:—  com1:0x8FCD0, 0x8FCD3, 0x8FCD4 */
        v = v / 6;
#endif
        /* 131:0x8FCD6, 0x8FCD9, 0x8FCDD, write 0x8FCE2  160:=
           com1:0x8FCD6, 0x8FCD9, 0x8FCDD, write 0x8FCE2 */
        bu->tohit = (int8_t)(bu->tohit + v);
    }

    /* -- HSA_MIGHT: +1 melee per level -------------------------------------------------- */
    /* 131:0x8FCE6, 0x8FCEC, 0x8FCF2  160:=  com1:0x8FCE6, 0x8FCEC, 0x8FCF2 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FCF9, 0x8FD01, 0x8FD05, jump 0x8FD0A -> 0x8FD2B  160:=
       com1:0x8FCF9, 0x8FD01, 0x8FD05, jump 0x8FD0A -> 0x8FD2B */
    if (hero->abilities & HSA_MIGHT) {
        /* 131:0x8FD0C, 0x8FD19, 0x8FD20, 0x8FD23, write 0x8FD28  160:=
           com1:0x8FD0C, 0x8FD19, 0x8FD20, 0x8FD23, write 0x8FD28 */
        bu->melee = (int8_t)((uint8_t)_UNITS[unit_idx].Level + bu->melee + 1);
    }

    /* -- HSA_MIGHT2: +3/2 melee per level ----------------------------------------------- */
    /* 131:0x8FD2B, 0x8FD31, 0x8FD37  160:=  com1:0x8FD2B, 0x8FD31, 0x8FD37 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FD3E, 0x8FD46, 0x8FD49, jump 0x8FD4E -> 0x8FD7B  160:=
       com1:0x8FD3E, 0x8FD46, 0x8FD49, jump 0x8FD4E -> 0x8FD7B */
    if (hero->abilities & HSA_MIGHT2) {
        /* `cbw` 0x8FD61, `inc ax` 0x8FD62, `imul 3` 0x8FD63, `cwd`/`sub`/`sar` 0x8FD68.
           131:0x8FD50, 0x8FD5D, 0x8FD61, 0x8FD63, 0x8FD68  160:=
           com1:0x8FD50, 0x8FD5D, 0x8FD61, 0x8FD63, 0x8FD68 */
        v = (int16_t)((_UNITS[unit_idx].Level + 1) * 3) / 2;
        /* 131:0x8FD6D, 0x8FD70, 0x8FD73, write 0x8FD78  160:=
           com1:0x8FD6D, 0x8FD70, 0x8FD73, write 0x8FD78 */
        bu->melee = (int8_t)(bu->melee + v);
    }

    /* -- HSA_ARCANE_POWER: +1 magic ranged per level ------------------------------------ */
    /* 131:0x8FD7B, 0x8FD81, 0x8FD87  160:=  com1:0x8FD7B, 0x8FD81, 0x8FD87 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FD8E, 0x8FD96, 0x8FD99, jump 0x8FD9E -> 0x8FDD4  160:=
       com1:0x8FD8E, 0x8FD96, 0x8FD99, jump 0x8FD9E -> 0x8FDD4 */
    if (hero->abilities & HSA_ARCANE_POWER) {
        /* `cbw` 0x8FDA7, `mov bx,10`/`cwd`/`idiv bx` 0x8FDA8, `cmp ax,3` 0x8FDAE.
           131:0x8FDA0, 0x8FDA3, 0x8FDA7, 0x8FDA8, 0x8FDAE, jump 0x8FDB1 -> 0x8FDD4  160:=
           com1:0x8FDA0, 0x8FDA3, 0x8FDA7, 0x8FDA8, 0x8FDAE, jump 0x8FDB1 -> 0x8FDD4 */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MAGIC) {
            /* 131:0x8FDB3, 0x8FDC0, 0x8FDC7, 0x8FDCB, write 0x8FDD0  160:=
               com1:0x8FDB3, 0x8FDC0, 0x8FDC7, 0x8FDCB, write 0x8FDD0 */
            bu->ranged = (int8_t)((uint8_t)_UNITS[unit_idx].Level + bu->ranged + 1);
        }
    }

    /* -- HSA_ARCANE_POWER2: +3/2 magic ranged per level --------------------------------- */
    /* 131:0x8FDD4, 0x8FDDA, 0x8FDE0  160:=  com1:0x8FDD4, 0x8FDDA, 0x8FDE0 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FDE7, 0x8FDEF, 0x8FDF2, jump 0x8FDF7 -> 0x8FE39  160:=
       com1:0x8FDE7, 0x8FDEF, 0x8FDF2, jump 0x8FDF7 -> 0x8FE39 */
    if (hero->abilities & HSA_ARCANE_POWER2) {
        /* 131:0x8FDF9, 0x8FDFC, 0x8FE00, 0x8FE01, 0x8FE07, jump 0x8FE0A -> 0x8FE39  160:=
           com1:0x8FDF9, 0x8FDFC, 0x8FE00, 0x8FE01, 0x8FE07, jump 0x8FE0A -> 0x8FE39 */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MAGIC) {
            /* `cwd` at 0x8FE24, `sub ax,dx` at 0x8FE25, `sar ax,1` at 0x8FE27.
               131:0x8FE0C, 0x8FE19, 0x8FE1D, 0x8FE1F, 0x8FE24  160:=
               com1:0x8FE0C, 0x8FE19, 0x8FE1D, 0x8FE1F, 0x8FE24 */
            v = (int16_t)((_UNITS[unit_idx].Level + 1) * 3) / 2;
            /* 131:0x8FE29, 0x8FE2C, 0x8FE30, write 0x8FE35  160:=
               com1:0x8FE29, 0x8FE2C, 0x8FE30, write 0x8FE35 */
            bu->ranged = (int8_t)(bu->ranged + v);
        }
    }

    /* -- Casting_Skill -> mana_max ------------------------------------------------------ */
    /* 131:0x8FE39, 0x8FE3F, 0x8FE45  160:=  com1:0x8FE39, 0x8FE3F, 0x8FE45 */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FE4C, jump 0x8FE51 -> 0x8FE98  160:=  com1:0x8FE4C, jump 0x8FE51 -> 0x8FE98 */
    if (hero->Casting_Skill > 0) {
#if BUILD == MOM131 || BUILD == CP160
        /* 1.31 re-derives the hero pointer a further time before the read; `cbw` 0x8FE6A,
           `inc ax` 0x8FE6B.   131:0x8FE53, 0x8FE59, 0x8FE5F, 0x8FE66, 0x8FE6A, 0x8FE6B
           160:=  com1:— */
        v = hero->Casting_Skill + 1;
        /* _UNITS is reloaded; AX is stacked across it at 0x8FE79/0x8FE82.
           131:0x8FE6C, 0x8FE79, 0x8FE7A, 0x8FE7E, 0x8FE7F, 0x8FE80, 0x8FE82, 0x8FE83
           160:=  com1:— */
        v = v * (_UNITS[unit_idx].Level + 1);
        /* `imul 5` then `cwd`/`sub ax,dx`/`sar ax,1`.
           131:0x8FE85, 0x8FE88, 0x8FE8A, 0x8FE8B, 0x8FE8D  160:=  com1:— */
        v = (v * 5) / 2;
        bu->mana_max = (int8_t)v;   /* 131:0x8FE8F, write 0x8FE92  160:=  com1:— */
#else
        /* CoM 1 reads through the pointer the block head already built — the 0x13-byte
           re-derivation 1.31 emits here is gone, which is what funds the rewrite. 1.31's
           `inc ax` becomes the two `nop` at 0x8FE58.
           131:—  160:—  com1:0x8FE53, 0x8FE57, 0x8FE58 */
        v = hero->Casting_Skill;
        /* _UNITS reload, then `cbw` 0x8FE6C and two `inc ax` at 0x8FE6D/0x8FE6E.
           131:—  160:—  com1:0x8FE5A, 0x8FE67, 0x8FE68, 0x8FE6C, 0x8FE6D, 0x8FE6E, 0x8FE72 */
        v = v * (_UNITS[unit_idx].Level + 2);
        /* `add ax, word cs:[di+0x1F3A]`. The read is 16-bit at a byte index, so it also
           pulls table[type+1] into AH; only AL is stored below, so the effective addend is
           the single byte at [type]. At type 34 the high byte is the `nop` at 0x8FB2D.
           Nop fill 0x8FE79..0x8FE8E.   131:—  160:—  com1:0x8FE74, 0x8FE79 */
        v += com1_hero_mana_table[type];
        bu->mana_max = (int8_t)v;   /* 131:—  160:—  com1:0x8FE8F, write 0x8FE92 */
#endif
        /* 131:0x8FE96 jmp 0x8FEA0  160:=  com1:0x8FE96 jmp 0x8FEA0 */
    } else {
        bu->mana_max = 0;           /* 131:0x8FE98, write 0x8FE9B  160:=
                                       com1:0x8FE98, write 0x8FE9B */
    }

    /* -- HSA_LUCKY ---------------------------------------------------------------------- */
    /* 131:0x8FEA0, 0x8FEA6, 0x8FEAC  160:=  com1:0x8FEA0, 0x8FEA6, 0x8FEAC */
    hero = &_HEROES2[owner]->heroes[type];
    /* 131:0x8FEB3, 0x8FEBB, 0x8FEBE, jump 0x8FEC3 -> 0x8FF05  160:=
       com1:0x8FEB3, 0x8FEBB, 0x8FEBE, jump 0x8FEC3 -> 0x8FF05 */
    if (hero->abilities & HSA_LUCKY) {
#if BUILD == MOM131 || BUILD == CP160
        /* 131:0x8FEC5, 0x8FEC8, 0x8FECC, write 0x8FED1  160:=  com1:— */
        bu->tohit = (int8_t)(bu->tohit + 1);
        /* 131:0x8FED5, 0x8FED8, 0x8FEDC, write 0x8FEE1  160:=  com1:— */
        bu->toblock = (int8_t)(bu->toblock + 1);
        /* 131:0x8FEE5, 0x8FEE8, 0x8FEEC, write 0x8FEF1  160:=  com1:— */
        bu->resist = (int8_t)(bu->resist + 1);
        /* 131:0x8FEF5, 0x8FEF8, 0x8FEFC, write 0x8FF01  160:=  com1:— */
        bu->Gold_Resist = (int8_t)(bu->Gold_Resist + 1);
#else
        /* Word test, raw 0x0400; idempotent — an already-set bit exits.
           131:—  160:—  com1:0x8FEC5, 0x8FEC8, jump 0x8FECE -> 0x8FF05 */
        if (bu->Attribs_1 & USA_LUCKY)
            goto lucky_done;
        /* Word OR, raw 0x0400; nop fill 0x8FED6..0x8FF04.
           131:—  160:—  com1:0x8FED0, 0x8FED6 */
        bu->Attribs_1 |= USA_LUCKY;
lucky_done: ;
#endif
    }
    /* epilogue.   131:0x8FF05, retf 0x8FF08  160:=  com1:0x8FF05, retf 0x8FF08 */
}


/* ===========================================================================================
 * BU_Apply_Battlefield_Effects(bu) — complete stat recompute.                 [R6.1c/R6.1d]
 *
 * Assigned extents: R6.1c owns mom131/mom160 0x8FF09-0x90635 and com1
 * 0x8FF09-0x9064B; R6.1d owns mom131/mom160 0x90635-0x90B8E, com1
 * 0x9064B-0x90B8E and its same-frame relocated tail 0x90B8E-0x90C00 (all half-open).
 * CoM 1 reaches that tail from 0x905B8, returns to 0x905BB, and then continues through the
 * main extent, so the tail executes before Heavenly Light and the R6.1d main body.
 * =========================================================================================== */

void __far BU_Apply_Battlefield_Effects(struct s_BATTLE_UNIT __far *bu)
{
    int16_t  si;
    int16_t  node_match;
    int16_t  item_idx;
    int16_t  di;
    uint8_t  mutations;
    uint16_t ench_lo, ench_hi;
#if BUILD == COM1
    int8_t   cl;
#endif

    /* 131:0x8FF09  160:=  com1:= — prologue, 0x0C-byte frame, save si/di. */
    si = bu->unit_idx;                                  /* 131:0x8FF11  160:=  com1:= */
    node_match = 0;                                     /* 131:0x8FF1B  160:=  com1:= */

    /* The binary's pairing is 0↔Sorcery, 2↔Chaos, 1↔Nature. The inner failures enter the
       next outer test, so this is an else-if chain rather than three independent tests. */
    if (_combat_node_type == CMB_NODE_SORCERY           /* 131:0x8FF20  160:=  com1:= */
        && bu->race == rt_Sorcery)                      /* 131:0x8FF2A  160:=  com1:= */
        node_match = 1;                                 /* 131:0x8FF31  160:=  com1:= */
    else if (_combat_node_type == CMB_NODE_CHAOS        /* 131:0x8FF38  160:=  com1:= */
             && bu->race == rt_Chaos)                   /* 131:0x8FF42  160:=  com1:= */
        node_match = 1;                                 /* 131:0x8FF49  160:=  com1:= */
    else if (_combat_node_type == CMB_NODE_NATURE       /* 131:0x8FF50  160:=  com1:= */
             && bu->race == rt_Nature)                  /* 131:0x8FF5A  160:=  com1:= */
        node_match = 1;                                 /* 131:0x8FF61  160:=  com1:= */

    if (node_match != 0) {                              /* 131:0x8FF66 -> 0x8FF6F/0x8FFF7  160:=  com1:= */
        bu->melee += 2;                                 /* 131:0x8FF6F  160:=  com1:= */
        bu->Gold_Melee += 2;                            /* 131:0x8FF7D  160:=  com1:= */
        if (bu->ranged > 0) {                           /* 131:0x8FF8D -> 0x8FFB7  160:=  com1:= */
            bu->ranged += 2;                            /* 131:0x8FF97  160:=  com1:= */
            bu->Gold_Ranged += 2;                       /* 131:0x8FFA7  160:=  com1:= */
        }
        bu->resist += 2;                                /* 131:0x8FFB7  160:=  com1:= */
        bu->Gold_Resist += 2;                           /* 131:0x8FFC7  160:=  com1:= */
        bu->defense += 2;                               /* 131:0x8FFD7  160:=  com1:= */
        bu->Gold_Defense += 2;                          /* 131:0x8FFE7  160:=  com1:= */
    }

    if (bu->melee > 0 && bu->race < RACE_FIRST_FANTASTIC) {
                                                        /* 131:0x8FFF7 -> 0x9004E  160:=  com1:= */
        bu->melee += (int8_t)leadership_bonus[bu->controller_idx];
                                                        /* 131:0x9000A  160:=  com1:= */
        bu->Gold_Melee += (int8_t)leadership_bonus[bu->controller_idx];
                                                        /* 131:0x9002B  160:=  com1:= */
    }

    if (bu->ranged > 0 && bu->race < RACE_FIRST_FANTASTIC
        && RAT_CLASS(bu->ranged_type) != RAT_CLASS_MAGIC) {
                                                        /* 131:0x9004E -> 0x900C5  160:=  com1:= */
        /* Full Borland signed /2 idiom at 0x90085: `26 8B 07 / 99 / 2B C2 / D1 F8`.
           `cwd; sub ax,dx; sar ax,1` truncates toward zero. The Gold twin repeats it at
           0x900AD (`26 8B 07 / 99 / 2B C2 / D1 F8`). */
        bu->ranged += leadership_bonus[bu->controller_idx] / 2;
                                                        /* 131:0x90075  160:=  com1:= */
        bu->Gold_Ranged += leadership_bonus[bu->controller_idx] / 2;
                                                        /* 131:0x9009D  160:=  com1:= */
    }

#if BUILD == MOM131 || BUILD == CP160
    if (bu->melee > 0) {                               /* 131:0x900C5 -> 0x90112  160:=  com1:— */
        bu->melee += (int8_t)holy_bonus[bu->controller_idx];
                                                        /* 131:0x900CE  160:=  com1:— */
        bu->Gold_Melee += (int8_t)holy_bonus[bu->controller_idx];
                                                        /* 131:0x900EF  160:=  com1:— */
    }
#else
    cl = (int8_t)holy_bonus[bu->controller_idx];       /* 131:—  160:—  com1:0x900C5 */
    if (bu->melee > 0) {                               /* 131:—  160:—  com1:0x900D8 -> 0x900E8 */
        bu->melee += cl;                               /* 131:—  160:—  com1:0x900E1 */
        bu->Gold_Melee += cl;                          /* 131:—  160:—  com1:0x900E4 */
    }
    if (bu->ranged > 0) {                              /* 131:—  160:—  com1:0x900E8 -> 0x900F7 */
        bu->ranged += cl;                              /* 131:—  160:—  com1:0x900EF */
        bu->Gold_Ranged += cl;                         /* 131:—  160:—  com1:0x900F3 */
    }
    /* 131:—  160:—  com1:0x900F7..0x90112 — 27 bytes of nop fill. */
#endif

    bu->resist += (int8_t)resistance_to_all[bu->controller_idx];
                                                        /* 131:0x90112  160:=  com1:= */
    bu->Gold_Resist += (int8_t)resistance_to_all[bu->controller_idx];
                                                        /* 131:0x90135  160:=  com1:= */
    bu->defense += (int8_t)holy_bonus[bu->controller_idx];
                                                        /* 131:0x90158  160:=  com1:= */
    bu->Gold_Defense += (int8_t)holy_bonus[bu->controller_idx];
                                                        /* 131:0x9017B  160:=  com1:= */

    if ((int8_t)_UNITS[si].Hero_Slot > HERO_SLOT_NONE) {
                                                        /* 131:0x9019E -> 0x901B5/0x90236  160:=  com1:= */
        for (di = 0; di < 3; di++) {                    /* 131:0x901B5/0x90230..0x90234  160:=  com1:= */
            item_idx = players[_UNITS[si].owner_idx].Heroes[_UNITS[si].Hero_Slot].Items[di];
                                                        /* 131:0x901B9  160:=  com1:= */
            if (item_idx > HERO_SLOT_NONE) {            /* 131:0x901F8 -> 0x90230  160:=  com1:= */
                /* Full split 32-bit mask: 0x9020C `26 8B 47 30`, 0x90210 `26 8B 57 2E`,
                   0x90214 `81 E2 00 40`, 0x90218 `25 00 00`, 0x9021B `0B D0`,
                   0x9021D `74 11`; this is `_ITEMS[].Powers & 0x00004000`. */
                if (_ITEMS[item_idx].Powers & IP_HASTE) /* 131:0x9020C -> 0x90230  160:=  com1:= */
                    bu->Combat_Effects |= BUE_HASTE;    /* 131:0x9021F  160:=  com1:= */
            }
        }
    }

    mutations = _UNITS[bu->unit_idx].mutations;        /* 131:0x90236  160:=  com1:= */

    if ((combat_enchantments[CE_HIGH_PRAYER_ATTACKER] == CE_PRAYER_ON
         && bu->controller_idx == _combat_attacker_player)
        || (combat_enchantments[CE_HIGH_PRAYER_DEFENDER] == CE_PRAYER_ON
            && bu->controller_idx == _combat_defender_player)) {
                                                        /* 131:0x9024E -> 0x90286/0x9032F  160:=  com1:= */
        bu->tohit++;                                   /* 131:0x90286  160:=  com1:= */
        bu->toblock++;                                 /* 131:0x90296  160:=  com1:= */
        bu->resist++;                                  /* 131:0x902A6  160:=  com1:= */
        bu->Gold_Resist++;                             /* 131:0x902B6  160:=  com1:= */
        if (bu->melee > 0) {                           /* 131:0x902C6 -> 0x902ED  160:=  com1:= */
            bu->melee += 2;                            /* 131:0x902CF  160:=  com1:= */
            bu->Gold_Melee += 2;                       /* 131:0x902DD  160:=  com1:= */
        }
#if BUILD == MOM131 || BUILD == CP160
        bu->resist += 2;                               /* 131:0x902ED  160:=  com1:— */
        bu->Gold_Resist += 2;                          /* 131:0x902FD  160:=  com1:— */
        bu->defense += 2;                              /* 131:0x9030D  160:=  com1:— */
        bu->Gold_Defense += 2;                         /* 131:0x9031D  160:=  com1:— */
        goto after_prayer;                             /* 131:0x9032D -> 0x903A1  160:=  com1:— */
#else
        bu->resist += 2;                               /* 131:—  160:—  com1:0x902F0 */
        bu->Gold_Resist += 2;                          /* 131:—  160:—  com1:0x902F5 */
        bu->defense += 2;                              /* 131:—  160:—  com1:0x902FA */
        bu->Gold_Defense += 2;                         /* 131:—  160:—  com1:0x902FF */
        goto after_prayer;                             /* 131:—  160:—  com1:0x90304 -> 0x90374 */
#endif
    }
    else if ((combat_enchantments[CE_PRAYER_ATTACKER] == CE_PRAYER_ON
              && bu->controller_idx == _combat_attacker_player)
             || (combat_enchantments[CE_PRAYER_DEFENDER] == CE_PRAYER_ON
                 && bu->controller_idx == _combat_defender_player)) {
                                                        /* 131:0x9032F -> 0x90361/0x903A1  160:=
                                                           com1:0x9032F -> 0x90361/0x90374 */
#if BUILD == MOM131 || BUILD == CP160
        bu->tohit++;                                   /* 131:0x90361  160:=  com1:— */
        bu->toblock++;                                 /* 131:0x90371  160:=  com1:— */
        bu->resist++;                                  /* 131:0x90381  160:=  com1:— */
        bu->Gold_Resist++;                             /* 131:0x90391  160:=  com1:— */
#else
        bu->tohit++;                                   /* 131:—  160:—  com1:0x90364 */
        bu->resist++;                                  /* 131:—  160:—  com1:0x90368 */
        bu->toblock++;                                 /* 131:—  160:—  com1:0x9036C */
        bu->Gold_Resist++;                             /* 131:—  160:—  com1:0x90370 */
#endif
    }

after_prayer:
#if BUILD == MOM131 || BUILD == CP160
    if (bu->race == rt_Life) {                         /* 131:0x903A1 -> 0x903AE/0x904EB  160:=  com1:— */
        if (combat_enchantments[CE_TRUE_LIGHT_ATTACKER] != 0
            || combat_enchantments[CE_TRUE_LIGHT_DEFENDER] != 0) {
                                                        /* 131:0x903AE -> 0x903C6/0x90457  160:=  com1:— */
            if (bu->melee > 0) {                       /* 131:0x903C6 -> 0x903ED  160:=  com1:— */
                bu->melee++;                           /* 131:0x903CF  160:=  com1:— */
                bu->Gold_Melee++;                      /* 131:0x903DD  160:=  com1:— */
            }
            if (bu->ranged > 0) {                      /* 131:0x903ED -> 0x90417  160:=  com1:— */
                bu->ranged++;                          /* 131:0x903F7  160:=  com1:— */
                bu->Gold_Ranged++;                     /* 131:0x90407  160:=  com1:— */
            }
            bu->resist++;                              /* 131:0x90417  160:=  com1:— */
            bu->Gold_Resist++;                         /* 131:0x90427  160:=  com1:— */
            bu->defense++;                             /* 131:0x90437  160:=  com1:— */
            bu->Gold_Defense++;                        /* 131:0x90447  160:=  com1:— */
        }
        if (combat_enchantments[CE_DARKNESS_ATTACKER] != 0
            || combat_enchantments[CE_DARKNESS_DEFENDER] != 0) {
                                                        /* 131:0x90457 -> 0x9046D/0x904EB  160:=  com1:— */
            bu->melee--;                               /* 131:0x9046D  160:=  com1:— */
            bu->Grey_Melee++;                          /* 131:0x9047B  160:=  com1:— */
            bu->ranged--;                              /* 131:0x9048B  160:=  com1:— */
            bu->Grey_Ranged++;                         /* 131:0x9049B  160:=  com1:— */
            bu->resist--;                              /* 131:0x904AB  160:=  com1:— */
            bu->Grey_Resist++;                         /* 131:0x904BB  160:=  com1:— */
            bu->defense--;                             /* 131:0x904CB  160:=  com1:— */
            bu->Grey_Defense++;                        /* 131:0x904DB  160:=  com1:— */
        }
    }

    if (bu->race == rt_Death) {                        /* 131:0x904EB -> 0x904F8/0x90635  160:=  com1:— */
        if (combat_enchantments[CE_DARKNESS_ATTACKER] != 0
            || combat_enchantments[CE_DARKNESS_DEFENDER] != 0) {
                                                        /* 131:0x904F8 -> 0x90511/0x905A2  160:=  com1:— */
            if (bu->melee > 0) {                       /* 131:0x90511 -> 0x90538  160:=  com1:— */
                bu->melee++;                           /* 131:0x9051A  160:=  com1:— */
                bu->Gold_Melee++;                      /* 131:0x90528  160:=  com1:— */
            }
            if (bu->ranged > 0) {                      /* 131:0x90538 -> 0x90562  160:=  com1:— */
                bu->ranged++;                          /* 131:0x90542  160:=  com1:— */
                bu->Gold_Ranged++;                     /* 131:0x90552  160:=  com1:— */
            }
            bu->resist++;                              /* 131:0x90562  160:=  com1:— */
            bu->Gold_Resist++;                         /* 131:0x90572  160:=  com1:— */
            bu->defense++;                             /* 131:0x90582  160:=  com1:— */
            bu->Gold_Defense++;                        /* 131:0x90592  160:=  com1:— */
        }
        if (combat_enchantments[CE_TRUE_LIGHT_ATTACKER] != 0
            || combat_enchantments[CE_TRUE_LIGHT_DEFENDER] != 0) {
                                                        /* 131:0x905A2 -> 0x905B7/0x90635  160:=  com1:— */
            bu->melee--;                               /* 131:0x905B7  160:=  com1:— */
            bu->Grey_Melee++;                          /* 131:0x905C5  160:=  com1:— */
            bu->ranged--;                              /* 131:0x905D5  160:=  com1:— */
            bu->Grey_Ranged++;                         /* 131:0x905E5  160:=  com1:— */
            bu->resist--;                              /* 131:0x905F5  160:=  com1:— */
            bu->Grey_Resist++;                         /* 131:0x90605  160:=  com1:— */
            bu->defense--;                             /* 131:0x90615  160:=  com1:— */
            bu->Grey_Defense++;                        /* 131:0x90625  160:=  com1:— */
        }
    }
    /* 131:0x90635  160:=  com1:— — R6.1d continues. */

#else  /* COM1 */
    if (events_table->Bad_Moon.status == EVENT_ACTIVE) {
                                                        /* 131:—  160:—  com1:0x90374 -> 0x9038C */
        bu->resist -= 2;                               /* 131:—  160:—  com1:0x90382 */
        bu->Grey_Resist += 2;                          /* 131:—  160:—  com1:0x90387 */
    }
    if (events_table->Conjunction_Nature.status == EVENT_ACTIVE) {
                                                        /* 131:—  160:—  com1:0x9038C; 0x90397 -> 0x90306 */
        if (bu->race >= RACE_FIRST_FANTASTIC && bu->race != rt_Death) {
                                                        /* 131:—  160:—  com1:0x90306 -> 0x9032B */
            bu->resist += 2;                           /* 131:—  160:—  com1:0x90317 */
            bu->Gold_Resist += 2;                      /* 131:—  160:—  com1:0x9031C */
            bu->defense += 2;                          /* 131:—  160:—  com1:0x90321 */
            bu->Gold_Defense += 2;                     /* 131:—  160:—  com1:0x90326 */
        }
        /* 131:—  160:—  com1:0x9032B -> 0x9039A; 0x9032E is one nop. */
    }

    ench_hi = _UNITS[bu->unit_idx].enchantments_hi | bu->enchantments_hi;
                                                        /* 131:—  160:—  com1:0x9039A..0x903BE */
    ench_lo = _UNITS[bu->unit_idx].enchantments_lo | bu->enchantments_lo;
                                                        /* 131:—  160:—  com1:0x903B6..0x903C1 */

    /* Blazing March — CoM 1's name for Metal Fires; same slot, same spell. */
    if ((combat_enchantments[CE_BLAZING_MARCH_ATTACKER] != 0
         && bu->controller_idx == _combat_attacker_player)
        || (combat_enchantments[CE_BLAZING_MARCH_DEFENDER] != 0
            && bu->controller_idx != _combat_attacker_player)) {
                                                        /* 131:—  160:—  com1:0x903C4 -> 0x903FC/0x90490 */
        /* 0x903FF tests UA_FANTASTIC, but 0x90405 is unconditional `EB 03`; the old
           `E9 86 00` skip survives unreachable at 0x90407. */
        (void)(bu->Abilities & UA_FANTASTIC);           /* 131:—  160:—  com1:0x903FC..0x9040A */
        /* 0x9040A assembles UE_FLAME_BLADE, but 0x90418/0x90419 are nops where its
           conditional branch stood, so this result is also discarded. */
        (void)(((uint32_t)ench_hi << 16 | ench_lo) & UE_FLAME_BLADE);
                                                        /* 131:—  160:—  com1:0x9040A..0x9041A */
        if (bu->melee > 0) {                           /* 131:—  160:—  com1:0x9041A -> 0x90441 */
            bu->melee += 3;                            /* 131:—  160:—  com1:0x90426 */
            bu->Gold_Melee += 3;                       /* 131:—  160:—  com1:0x90434 */
        }
        /* Exact signed `/10`: `26 8A 47 02 / 98 / BB 0A 00 / 99 / F7 FB`. The raw
           Thrown compare at 0x90457 is followed by unconditional `EB 20` at 0x9045C. */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE) {
                                                        /* 131:—  160:—  com1:0x90441 -> 0x9045E/0x9047E */
            bu->ranged += 3;                           /* 131:—  160:—  com1:0x90461 */
            bu->Gold_Ranged += 3;                      /* 131:—  160:—  com1:0x90471 */
        }
        if (bu->Weapon_Plus1 == 0)                     /* 131:—  160:—  com1:0x9047E -> 0x90490 */
            bu->Weapon_Plus1 = 1;                      /* 131:—  160:—  com1:0x9048B */
    }

    if ((combat_enchantments[CE_MASS_INVISIBILITY_ATTACKER] != 0
         && bu->controller_idx == _combat_attacker_player)
        || (combat_enchantments[CE_MASS_INVISIBILITY_DEFENDER] != 0
            && bu->controller_idx != _combat_attacker_player)) {
                                                        /* 131:—  160:—  com1:0x90490 -> 0x904C2/0x904DF */
        bu->Abilities |= UA_INVISIBILITY;               /* 131:—  160:—  com1:0x904C5 */
        /* 131:—  160:—  com1:0x904CA..0x904DF — 21 bytes of nop fill. */
    }

    if ((combat_enchantments[CE_WARP_REALITY_ATTACKER] != 0
         || combat_enchantments[CE_WARP_REALITY_DEFENDER] != 0)
        && bu->race != rt_Chaos) {                      /* 131:—  160:—  com1:0x904DF -> 0x904FF/0x9050F */
        bu->tohit -= 2;                                 /* 131:—  160:—  com1:0x90502 */
    }

    if ((combat_enchantments[CE_BLACK_PRAYER_ATTACKER] != 0
         && bu->controller_idx != _combat_attacker_player)
        || (combat_enchantments[CE_BLACK_PRAYER_DEFENDER] != 0
            && bu->controller_idx == _combat_attacker_player)) {
                                                        /* 131:—  160:—  com1:0x9050F -> 0x90544/0x90568 */
        bu->melee--;                                   /* 131:—  160:—  com1:0x90547 */
        bu->ranged--;                                  /* 131:—  160:—  com1:0x9054A */
        bu->defense--;                                 /* 131:—  160:—  com1:0x9054E */
        bu->resist -= 2;                               /* 131:—  160:—  com1:0x90552 */
        bu->Grey_Melee++;                              /* 131:—  160:—  com1:0x90557 */
        bu->Grey_Ranged++;                             /* 131:—  160:—  com1:0x9055B */
        bu->Grey_Defense++;                            /* 131:—  160:—  com1:0x9055F */
        bu->Grey_Resist += 2;                          /* 131:—  160:—  com1:0x90563 */
    }

    if (bu->Move_Flags & MV_UNKNOWN_0400)              /* 131:—  160:—  com1:0x9056B -> 0x90576 */
        bu->tohit--;                                   /* 131:—  160:—  com1:0x90572 */

    {   int16_t guardian = 1;                          /* 131:—  160:—  com1:0x9057C */
        if (*((uint8_t __far *)&players[bu->controller_idx] + COM1_PLAYER_GUARDIAN_OFF) == 0)
                                                        /* 131:—  160:—  com1:0x90582..0x9058E; DS:0x9F34 */
            guardian = 0;                              /* 131:—  160:—  com1:0x90590 */
        if (_combat_environ == 1
            && bu->controller_idx == _combat_defender_player
            && guardian != 0) {                        /* 131:—  160:—  com1:0x90595 -> 0x905A8/0x905B8 */
            bu->tohit++;                               /* 131:—  160:—  com1:0x905A8 */
            bu->resist++;                              /* 131:—  160:—  com1:0x905AC */
            bu->toblock++;                             /* 131:—  160:—  com1:0x905B0 */
            bu->Gold_Resist++;                         /* 131:—  160:—  com1:0x905B4 */
        }
    }

    /* 131:—  160:—  com1:0x905B8 `E9 D3 05` -> 0x90B8E. The R6.1d relocated tail
       ends at 0x90BFD with `E9 BB F9` -> 0x905BB, preserving this frame. */
    goto com1_relocated_tail_0x90B8E;

com1_reentry_0x905BB:
    if (bu->controller_idx == _combat_defender_player  /* 131:—  160:—  com1:0x905BB -> 0x905C8/0x9064B */
        && battlefield->city_enchantments[CITY_ENCHANT_HEAVENLY_LIGHT] != 0) {
                                                        /* raw battlefield +0x1593; 131:—  160:—  com1:0x905C8 -> 0x905D6/0x9064B */
        cl = _UNITS[si].mutations;                      /* 131:—  160:—  com1:0x905D6 */
        if (_UNITS[si].type >= COM1_HOLY_ARMS_TYPE_CEILING)
                                                        /* 131:—  160:—  com1:0x905E7 -> 0x905F0 */
            cl = UM_MAGIC_WEAPONS;                      /* 131:—  160:—  com1:0x905EE */
        if (bu->melee > 0) {                           /* 131:—  160:—  com1:0x905F3 -> 0x90609 */
            bu->melee++;                               /* 131:—  160:—  com1:0x905F9 */
            bu->Gold_Melee++;                          /* 131:—  160:—  com1:0x905FC */
            if (!(cl & UM_WEAPON_QUALITY_MASK))        /* 131:—  160:—  com1:0x90600 -> 0x90609 */
                bu->melee_tohit++;                     /* 131:—  160:—  com1:0x90605 */
        }
        if (bu->ranged > 0) {                          /* 131:—  160:—  com1:0x90609 -> 0x9062F */
            bu->ranged++;                              /* 131:—  160:—  com1:0x90610 */
            bu->Gold_Ranged++;                         /* 131:—  160:—  com1:0x90614 */
            if (!(cl & UM_WEAPON_QUALITY_MASK)
                && (bu->ranged_type == RAT_THROWN || bu->ranged_type < RAT_MAGIC_FIRST))
                                                        /* 131:—  160:—  com1:0x90618 -> 0x9062B/0x9062F */
                bu->ranged_tohit++;                    /* 131:—  160:—  com1:0x9062B */
        }
        bu->defense++;                                 /* 131:—  160:—  com1:0x9062F */
        bu->resist++;                                  /* 131:—  160:—  com1:0x90633 */
        bu->Gold_Defense++;                            /* 131:—  160:—  com1:0x90637 */
        bu->Gold_Resist++;                             /* 131:—  160:—  com1:0x9063B */
        if (bu->Weapon_Plus1 == 0)                     /* 131:—  160:—  com1:0x9063F -> 0x9064B */
            bu->Weapon_Plus1 = 1;                      /* 131:—  160:—  com1:0x90646 */
    }
    /* 131:—  160:—  com1:0x9064B — R6.1d continues. */
#endif /* R6.1c build split */

    /* =====================================================================================
     * R6.1d — second half. MoM/CP enter at 0x90635; CoM 1 enters at 0x9064B after its
     * relocated tail and Heavenly Light block. CP 1.60 first diverges from 1.31 here.
     * ===================================================================================== */

#if BUILD == MOM131 || BUILD == CP160
    ench_hi = _UNITS[bu->unit_idx].enchantments_hi | bu->enchantments_hi;
                                                        /* 131:0x90635..0x90659  160:=  com1:— */
    ench_lo = _UNITS[bu->unit_idx].enchantments_lo | bu->enchantments_lo;
                                                        /* 131:0x9064A..0x9065C  160:=  com1:— */

    if ((combat_enchantments[CE_METAL_FIRES_ATTACKER] != 0
         && bu->controller_idx == _combat_attacker_player)
        || (combat_enchantments[CE_METAL_FIRES_DEFENDER] != 0
            && bu->controller_idx != _combat_attacker_player)) {
                                                        /* 131:0x9065F -> 0x90697/0x9072B  160:= */
        if (!(bu->Abilities & UA_FANTASTIC)             /* 131:0x9069A -> 0x906A5/0x9072B  160:= */
            && !(((uint32_t)ench_hi << 16 | ench_lo) & UE_FLAME_BLADE)) {
                                                        /* 131:0x906A5 -> 0x906B5/0x9072B  160:= */
            if (bu->melee > 0) {                        /* 131:0x906B8 -> 0x906DC  160:= */
                bu->melee++;                            /* 131:0x906C1  160:= */
                bu->Gold_Melee++;                       /* 131:0x906CF  160:= */
            }
            if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE
                || bu->ranged_type == RAT_THROWN) {     /* 131:0x906DC -> 0x906F9/0x90719  160:= */
                bu->ranged++;                           /* 131:0x906FC  160:= */
                bu->Gold_Ranged++;                      /* 131:0x9070C  160:= */
            }
            if (bu->Weapon_Plus1 == 0)                  /* 131:0x9071C -> 0x9072B  160:= */
                bu->Weapon_Plus1 = 1;                   /* 131:0x90723  160:= */
        }
    }

    if ((combat_enchantments[CE_MASS_INVISIBILITY_ATTACKER] != 0
         && bu->controller_idx == _combat_attacker_player)
        || (combat_enchantments[CE_MASS_INVISIBILITY_DEFENDER] != 0
            && bu->controller_idx != _combat_attacker_player)) {
                                                        /* 131:0x9072B -> 0x9075D/0x9077A  160:= */
        bu->enchantments |= UE_INVISIBILITY;            /* 131:0x9075D..0x90776  160:= */
    }

    if ((combat_enchantments[CE_WARP_REALITY_ATTACKER] != 0
         || combat_enchantments[CE_WARP_REALITY_DEFENDER] != 0)
        && bu->race != rt_Chaos) {                      /* 131:0x9077A -> 0x9079D/0x907AA  160:= */
        bu->tohit -= 2;                                 /* 131:0x9079D  160:= */
    }

    if ((combat_enchantments[CE_BLACK_PRAYER_ATTACKER] != 0
         && bu->controller_idx != _combat_attacker_player)
        || (combat_enchantments[CE_BLACK_PRAYER_DEFENDER] != 0
            && bu->controller_idx == _combat_attacker_player)) {
                                                        /* 131:0x907AA -> 0x907DF/0x9085D  160:= */
        bu->melee--;                                    /* 131:0x907E2  160:= */
        bu->ranged--;                                   /* 131:0x907F0  160:= */
        bu->resist -= 2;                                /* 131:0x90800  160:= */
        bu->Grey_Melee++;                               /* 131:0x90810  160:= */
        bu->Grey_Ranged++;                              /* 131:0x90820  160:= */
        bu->Grey_Resist += 2;                           /* 131:0x90830  160:= */
        bu->defense--;                                  /* 131:0x90840  160:= */
        bu->Grey_Defense++;                             /* 131:0x90850  160:= */
    }
#endif

#if BUILD == MOM131
    if (bu->Combat_Effects & BUE_UNKNOWN_0400) {        /* 131:0x90860 -> 0x9086B/0x90898 */
        bu->tohit--;                                    /* 131:0x9086B */
        bu->resist--;                                   /* 131:0x9087B */
        /* The raw displacement is +0x67, the bonus accumulator, despite the reduction. */
        bu->Gold_Resist++;                              /* 131:0x9088B */
    }
#endif

#if BUILD == CP160
    if (bu->Combat_Effects & BUE_BLACK_SLEEP)           /* 160:0x90860 -> 0x90868/0x9086D */
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) = 0; /* 160:0x90868 */

    {   int16_t guardian = 1;                           /* 160:0x90873 */
        (void)(*((uint8_t far *)&players[bu->controller_idx]
                 + PLAYER_RETORT_UNKNOWN_006A) == 0);   /* 160:0x90876..0x9088B; DS:0x9F34 */
        goto cp160_disabled_006A;                       /* 160:0x90885 `EB 02` -> 0x90889 */
        /* dead: guardian = 0;                             160:0x90887 */
cp160_disabled_006A:
        (void)(_combat_environ == 1);                   /* 160:0x9088C */
        goto cp160_after_006A;                          /* 160:0x90891 `EB 1C` -> 0x908AF */
        /* dead 0x90893..0x908AE: controller/guardian tests and four stat increments. */
        (void)guardian;
cp160_after_006A:
        ;                                               /* 160:0x908AF..0x908BC — nop fill */
    }
#endif

#if BUILD == MOM131 || BUILD == CP160
    if (bu->Combat_Effects & BUE_VERTIGO) {             /* 131:0x9089B -> 0x908A6/0x908D3
                                                           160:0x908BC -> 0x908C4/0x908E2 */
        bu->tohit -= 2;                                 /* 131:0x908A6  160:0x908C4 */
        bu->defense--;                                  /* 131:0x908B6  160:0x908CE */
        bu->Grey_Defense++;                             /* 131:0x908C6  160:0x908D8 */
    }
#else
    /* com1:0x9064B..0x90651 — load bu, then three nops. */
    if (bu->Combat_Effects & BUE_VERTIGO) {             /* com1:0x90651 -> 0x90659/0x90662 */
        bu->tohit -= 3;                                 /* com1:0x90659 */
        bu->toblock--;                                  /* com1:0x9065E */
    }
#endif

#if BUILD == MOM131 || BUILD == CP160
    if (bu->Combat_Effects & BUE_WEAKNESS) {            /* 131:0x908D6 -> 0x908E1/0x90942
                                                           160:0x908E2 -> 0x908EA/0x90942 */
        bu->melee -= 2;                                 /* 131:0x908E1  160:0x908EA */
        bu->Grey_Melee += 2;                            /* 131:0x908EF  160:0x908F5 */
#if BUILD == MOM131
        /* The second class divide at 0x90912 makes the raw Thrown comparison unreachable. */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE
            || RAT_CLASS(bu->ranged_type) == RAT_THROWN) {
                                                        /* 131:0x908FF -> 0x90922/0x90942 */
#else
        /* 0x90917 replaces the second divide with six nops, restoring raw Thrown. */
        if (RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE
            || bu->ranged_type == RAT_THROWN) {         /* 160:0x908FF -> 0x90922/0x90942 */
#endif
            bu->ranged -= 2;                            /* 131:0x90925  160:= */
            bu->Grey_Ranged += 2;                       /* 131:0x90935  160:= */
        }
    }
#else
    if (bu->Combat_Effects & BUE_WEAKNESS) {            /* com1:0x90662 -> 0x9066A/0x906C2 */
        bu->melee -= 3;                                 /* com1:0x9066A */
        bu->Grey_Melee += 3;                            /* com1:0x90675 */
        if (RAT_CLASS(bu->ranged_type) <= RAT_CLASS_MAGIC
            || bu->ranged_type == RAT_THROWN) {         /* com1:0x9067F -> 0x906A2/0x906C2 */
            bu->ranged -= 3;                            /* com1:0x906A5 */
            bu->Grey_Ranged += 3;                       /* com1:0x906B5 */
        }
    }
#endif

#if BUILD == MOM131 || BUILD == CP160
    if (bu->Combat_Effects & BUE_MIND_STORM) {          /* 131:0x90945 -> 0x90950/0x909CB  160:= */
        bu->melee -= 5;                                 /* 131:0x90950  160:= */
        bu->ranged -= 5;                                /* 131:0x9095E  160:= */
        bu->resist -= 5;                                /* 131:0x9096E  160:= */
        bu->defense -= 5;                               /* 131:0x9097E  160:= */
        bu->Grey_Defense += 5;                          /* 131:0x9098E  160:= */
        bu->Grey_Melee += 5;                            /* 131:0x9099E  160:= */
        bu->Grey_Ranged += 5;                           /* 131:0x909AE  160:= */
        bu->Grey_Resist += 5;                           /* 131:0x909BE  160:= */
    }
#else
    if (bu->Combat_Effects & BUE_MIND_STORM) {          /* com1:0x906C5 -> 0x906CD/0x906F4 */
        bu->melee -= 3;                                 /* com1:0x906CD */
        bu->ranged -= 5;                                /* com1:0x906D1 */
        bu->defense -= 5;                               /* com1:0x906D6 */
        bu->resist -= 5;                                /* com1:0x906DB */
        bu->Grey_Melee += 3;                            /* com1:0x906E0 */
        bu->Grey_Ranged += 5;                           /* com1:0x906E5 */
        bu->Grey_Defense += 5;                          /* com1:0x906EA */
        bu->Grey_Resist += 5;                           /* com1:0x906EF */
    }
#endif

    ench_hi = (_UNITS[bu->unit_idx].enchantments_hi ^ bu->enchantments_hi)
              & bu->enchantments_hi;                   /* 131:0x909CB..0x90A06  160:=
                                                           com1:0x906F4..0x9072C */
    ench_lo = (_UNITS[bu->unit_idx].enchantments_lo ^ bu->enchantments_lo)
              & bu->enchantments_lo;                   /* 131:0x909E0..0x90A09  160:=
                                                           com1:0x90706..0x9072F */
#if BUILD == MOM131
    BU_Apply_Specials(bu, (uint32_t)ench_hi << 16 | ench_lo, mutations);
                                                        /* call 131:0x90A1D -> 0x8F310 */
#else
    BU_Apply_Specials(bu, (uint32_t)ench_hi << 16 | ench_lo, 0);
                                                        /* call 160:0x90A1D -> 0x8F310
                                                           call com1:0x90743 -> 0x8F310 */
#endif

#if BUILD == MOM131 || BUILD == CP160
    if (bu->Combat_Effects & BUE_WARPED_ATTACK) {       /* 131:0x90A26 -> 0x90A31/0x90A66  160:= */
        bu->Grey_Melee += (bu->melee + 1) / 2;          /* 131:0x90A31..0x90A47  160:= */
        bu->melee -= (bu->melee + 1) / 2;               /* 131:0x90A4E..0x90A63  160:= */
    }
    if (bu->Combat_Effects & BUE_WARPED_DEFENSE) {      /* 131:0x90A69 -> 0x90A74/0x90AAD  160:= */
        bu->Grey_Defense += (bu->defense + 1) / 2;      /* 131:0x90A74..0x90A8B  160:= */
        bu->defense -= (bu->defense + 1) / 2;           /* 131:0x90A92..0x90AA9  160:= */
    }
#else
    if (bu->Combat_Effects & BUE_WARPED_ATTACK) {       /* com1:0x9074C -> 0x90754/0x90776 */
        int8_t old_melee = bu->melee;                   /* com1:0x90754 */
        bu->melee = old_melee >> 1;                     /* store com1:0x9075B */
        bu->Grey_Melee += old_melee - bu->melee;        /* com1:0x90760 */
        {   int8_t old_ranged = bu->ranged;             /* com1:0x90764 */
            bu->ranged = old_ranged >> 1;               /* store com1:0x9076E */
            bu->Grey_Ranged += old_ranged - bu->ranged; /* com1:0x90772 */
        }
    }
    if (bu->Combat_Effects & BUE_WARPED_DEFENSE) {      /* com1:0x90776 -> 0x9077E/0x90795 */
        int8_t old_defense = bu->defense;
        bu->defense = old_defense / 3;                  /* signed idiv; com1:0x9077E..0x90791 */
        bu->Grey_Defense += old_defense - bu->defense;  /* com1:0x90787..0x9078D */
    }
#endif

    if (bu->Combat_Effects & BUE_WARPED_RESIST) {       /* 131:0x90AB0 -> 0x90ABB/0x90ACE  160:=
                                                           com1:0x90795 -> 0x9079D/0x907AA */
        bu->Grey_Resist += bu->resist;                  /* 131:0x90ABB  160:=  com1:0x9079D */
        bu->resist = 0;                                 /* 131:0x90AC9  160:=  com1:0x907A5 */
    }

#if BUILD == COM1
    if (bu->Combat_Effects & BUE_BLACK_SLEEP)           /* com1:0x907AD -> 0x907B5/0x907BA */
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) = 0; /* com1:0x907B5 */

    if (bu->controller_idx == _combat_defender_player  /* com1:0x907BF -> 0x907C9/0x907D9 */
        && battlefield->city_enchantments[CITY_ENCHANT_FLYING_FORTRESS] != 0)
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) |= MV_FLYING; /* com1:0x907D4 */
#endif

#if BUILD == MOM131 || BUILD == COM1
    if (bu->Combat_Effects & BUE_SHATTER) {             /* 131:0x90AD1 -> 0x90ADC/0x90B1C
                                                           com1:0x907DC -> 0x907E7/0x90827 */
        if (bu->melee > 1) {
            bu->melee = 1;                              /* 131:0x90AE5  com1:0x907F0 */
            bu->Grey_Melee = bu->melee - 1;             /* 131:0x90AF0..0x90AF6  com1:0x907FB */
        }
        if (bu->ranged > 1) {
            bu->ranged = 1;                             /* 131:0x90B07  com1:0x90812 */
            bu->Grey_Ranged = bu->ranged - 1;           /* 131:0x90B0F..0x90B18  com1:0x9081A */
        }
    }
#else
    if (bu->Combat_Effects & BUE_SHATTER) {             /* 160:0x90AD1 -> 0x90ADC/0x90B1C */
        if (bu->melee > 1) {
            bu->Grey_Melee += bu->melee - 1;            /* 160:0x90AE5..0x90AF0 */
            bu->melee = 1;                              /* 160:0x90AF6 */
        }
        if (bu->ranged > 1) {
            bu->Grey_Ranged += bu->ranged - 1;          /* 160:0x90B07..0x90B0F */
            bu->ranged -= bu->ranged - 1;               /* 160:0x90B18 */
        }
    }
#endif

#if BUILD == COM1
    if ((bu->Combat_Effects & BUE_WEB)
        && (*((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) & MV_FLYING)) {
                                                        /* com1:0x9082A -> 0x9083F/0x9084C */
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) ^= MV_FLYING; /* com1:0x9083F..0x90848 */
    }

    if (bu->race == rt_Life                             /* com1:0x9084F -> 0x9085D/0x908ED */
        && (combat_enchantments[CE_DARKNESS_ATTACKER] != 0
            || combat_enchantments[CE_DARKNESS_DEFENDER] != 0)) {
        bu->melee--;       bu->Grey_Melee++;            /* com1:0x90872/0x90880 */
        bu->ranged--;      bu->Grey_Ranged++;           /* com1:0x90890/0x908A0 */
        bu->resist--;      bu->Grey_Resist++;           /* com1:0x908B0/0x908C0 */
        bu->defense--;     bu->Grey_Defense++;          /* com1:0x908D0/0x908E0 */
    }

    if (bu->race == rt_Death                            /* com1:0x908F0 -> 0x908FE/0x9098F */
        && (combat_enchantments[CE_DARKNESS_ATTACKER] != 0
            || combat_enchantments[CE_DARKNESS_DEFENDER] != 0)) {
        if (bu->melee > 0) {
            bu->melee++;       bu->Gold_Melee++;        /* com1:0x9091F/0x9092D */
        }
        if (bu->ranged > 0) {
            bu->ranged++;      bu->Gold_Ranged++;       /* com1:0x90947/0x90957 */
        }
        bu->resist++;          bu->Gold_Resist++;       /* com1:0x90967/0x90971 */
        bu->defense++;         bu->Gold_Defense++;      /* com1:0x9097B/0x90985 */
    }

    if (bu->status == bus_Active                       /* com1:0x90992 -> 0x909A8/0x90A5C */
        && ((combat_enchantments[CE_SUPREME_LIGHT_ATTACKER] != 0
             && bu->controller_idx == _combat_attacker_player)
            || (combat_enchantments[CE_SUPREME_LIGHT_DEFENDER] != 0
                && bu->controller_idx != _combat_attacker_player))) {
                                                        /* com1:0x909A8..0x909D2 -> 0x909DB/0x90A5C */
        if ((bu->ranged_type > RAT_MAGIC_FIRST && bu->ranged_type < RAT_THROWN)
            || bu->race == rt_Life
            || bu->mana_max != 0
            || (_UNITS[bu->unit_idx].enchantments_lo & UE_LOW_WORD(UE_FOCUS_MAGIC))
            || (unit_types[_UNITS[bu->unit_idx].type].ranged_type >= RAT_MAGIC_FIRST
                && unit_types[_UNITS[bu->unit_idx].type].ranged_type < RAT_THROWN)) {
                                                        /* com1:0x909DB..0x90A27 -> 0x90A29/0x90A5C */
            bu->melee += 2;                             /* com1:0x90A2C — ungated */
            bu->Gold_Melee += 2;                        /* com1:0x90A30 */
            if (bu->ranged > 0) {
                bu->ranged += 2;                        /* com1:0x90A3C */
                bu->Gold_Ranged += 2;                   /* com1:0x90A41 */
            }
            bu->defense += bu->resist / 3;              /* signed idiv; com1:0x90A46..0x90A4F */
            bu->Gold_Defense += bu->resist / 3;         /* com1:0x90A53 */
            bu->Move_Flags |= MV_UNKNOWN_0100;          /* byte OR at +0x17; com1:0x90A57 */
        }
    }

    if (bu->race != rt_Fantastic_No_Realm               /* com1:0x90A64 -> 0x90A69/0x90AA0 */
        && bu->race > RACE_FIRST_FANTASTIC
        && battlefield->city_enchantments[CITY_ENCHANT_WARD_FIRST
                                           + (bu->race - rt_Nature)] != 0) {
                                                        /* com1:0x90A7F -> 0x90A87/0x90AA0 */
        bu->tohit -= 2;                                 /* com1:0x90A87 */
        bu->defense -= 3;                               /* com1:0x90A8C */
        bu->resist -= 3;                                /* com1:0x90A91 */
        bu->Grey_Defense += 3;                          /* com1:0x90A96 */
        bu->Grey_Resist += 3;                           /* com1:0x90A9B */
    }

    if (*((uint8_t far *)&players[bu->controller_idx] + COM1_PLAYER_TACTICIAN_OFF) != 0) {
                                                        /* com1:0x90AA0..0x90AB2 */
        bu->defense++;         bu->Gold_Defense++;      /* com1:0x90AB4/0x90AB8 */
        if ((int8_t)_UNITS[si].Hero_Slot > HERO_SLOT_NONE) {
                                                        /* [bp-2] si; com1:0x90ABE..0x90AD2 */
            bu->defense++;     bu->Gold_Defense++;      /* com1:0x90AD4/0x90AD8 */
            bu->melee += 2;    bu->Gold_Melee += 2;     /* com1:0x90ADC/0x90AE0 */
            if (bu->ranged_type > RAT_NONE) {
                bu->ranged += 2; bu->Gold_Ranged += 2;  /* com1:0x90AEC/0x90AF1 */
            }
            bu->resist += 2;   bu->Gold_Resist += 2;    /* com1:0x90AF6/0x90AFB */
        }
    }

    if (bu->tohit < -2)                                /* com1:0x90B00 -> 0x90B07/0x90B0C */
        bu->tohit = -2;                                 /* com1:0x90B07 */
    /* com1:0x90B0F `EB 30` -> 0x90B41 skips the near helper at 0x90B11..0x90B40. */
#endif

    if (bu->melee < 0)                                 /* 131:0x90B1F -> 0x90B28/0x90B2C  160:=
                                                           com1:0x90B44 -> 0x90B4D/0x90B51 */
        bu->melee = 0;                                  /* 131:0x90B28  160:=  com1:0x90B4D */
    if (bu->ranged < 0)                                /* 131:0x90B2F -> 0x90B39/0x90B3E  160:=
                                                           com1:0x90B54 -> 0x90B5E/0x90B63 */
        bu->ranged = 0;                                 /* 131:0x90B39  160:=  com1:0x90B5E */
    if (bu->defense < 0)                               /* 131:0x90B41 -> 0x90B4B/0x90B50  160:=
                                                           com1:0x90B66 -> 0x90B70/0x90B75 */
        bu->defense = 0;                                /* 131:0x90B4B  160:=  com1:0x90B70 */

#if BUILD == MOM131 || BUILD == CP160
    if ((bu->Combat_Effects & BUE_WEB)
        && (*((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) & MV_FLYING)) {
                                                        /* 131:0x90B53 -> 0x90B68/0x90B75  160:= */
        *((uint8_t far *)bu + BU_OFF_MOVE_FLAGS_LO) ^= MV_FLYING;
                                                        /* 131:0x90B68..0x90B71  160:= */
    }
#endif

    bu->hits = BU_Recompute_Hit_Points(bu);             /* call 131:0x90B7C  160:=  com1:=;
                                                           store 131:0x90B81  160:=  com1:= */
    /* 131:0x90B88  160:=  com1:= — epilogue and retf. */
    return;

#if BUILD == COM1
com1_relocated_tail_0x90B8E:
    /* Entered from 0x905B8 in the same frame, before Heavenly Light. */
    di = (uint8_t)bu->controller_idx;                    /* com1:0x90B8E..0x90B94 */
    cl = guiding_beacon_max[di];                         /* DS:0x3AB3; com1:0x90B96 */
    if (bu->ranged_type > 0 && bu->ranged_type < RAT_THROWN) {
                                                        /* com1:0x90B9A -> 0x90BA8/0x90BB0 */
        bu->ranged += cl;                                /* com1:0x90BA8 */
        bu->Gold_Ranged += cl;                           /* com1:0x90BAC */
    }
    cl = divine_barrier_max[di];                         /* DS:0x3AC1; com1:0x90BB0 */
    bu->defense += cl;                                   /* com1:0x90BB4 */
    bu->Gold_Defense += cl;                              /* com1:0x90BB8 */
    cl = soul_linker_max[di];                            /* DS:0x3ABA; com1:0x90BBC */
    if (bu->Abilities & UA_FANTASTIC) {                  /* com1:0x90BC0 -> 0x90BC9/0x90BD9 */
        bu->tohit += cl / 2;                             /* com1:0x90BC9..0x90BCD */
        bu->toblock += cl / 2;                           /* com1:0x90BD1 */
        bu->tohit += cl % 2;                             /* com1:0x90BD5 */
    }
    Battle_Unit_Moves2((int16_t)(((uint16_t)bu - (uint16_t)_battle_units) / 0x6E));
                                                        /* call com1:0x90BE9; setup 0x90BD9..0x90BEE */
    /* com1:0x90BEF..0x90BFD — fourteen nops. */
    goto com1_reentry_0x905BB;                          /* com1:0x90BFD -> 0x905BB */
#endif
}


#if BUILD == COM1
/* Near helper embedded at 0x90B11..0x90B40. It takes no pushed argument, sets up no frame and
 * reads the constructor caller's far `bu` argument at [bp+6]; `bu` below names that hidden
 * caller-frame dependency. Main recompute flow jumps over the body at 0x90B0F. */
static void near Eternal_Night_Penalty_0x90B11(void)
{
    int16_t p = 0;                                      /* com1:0x90B11 */
    do {
        if (players[p].Globals[OE_ETERNAL_NIGHT] != 0   /* com1:0x90B1A -> 0x90B21/0x90B39 */
            && bu->controller_idx != p                  /* com1:0x90B24 -> 0x90B2A/0x90B39 */
            && bu->race != rt_Death) {                  /* com1:0x90B2A -> 0x90B31/0x90B39 */
            bu->resist--;                               /* com1:0x90B31 */
            bu->Grey_Resist++;                          /* com1:0x90B35 */
        }
        p++;                                             /* com1:0x90B39 */
    } while (p < num_players);                          /* com1:0x90B3A; 0x90B3E -> 0x90B13 */
}                                                       /* near ret at com1:0x90B40 */
#endif
