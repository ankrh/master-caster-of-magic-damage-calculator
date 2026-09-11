/* DOS combat dispatch reconstructed from the three WIZARDS.EXE builds.
 *
 * Landed so far: R6.2a BU_AttackTarget, R6.2b/R6.2c BU_ProcessAttack, R6.2d's
 * shared combat-resolution helpers, R6.2e's defense-special and Wall of Fire helpers,
 * R6.2f's spell-damage/application closure, R6.5a's side-wide Illusion-sight refresh,
 * R6.5b's exported battle-unit healing/temporary-Hits routine, and R6.5d's exported
 * battlefield side-bonus aggregation routine, and R9-G1a-R1's battle-unit load-to-combat
 * routine and CoM 1 identity tail, A32's Shatter target-admission and generic
 * effect-setter path, D35's CoM 1 Raise Dead routine and dispatcher case, and D37's
 * complete CoM 6.08 post-combat result-materialization routine.
 *
 * Conventions (C vocabulary, fixed 131/160/com1 address order, symbolic constants and
 * per-build ledgers) are in README.md. Coverage, branch/call inventories and findings live in
 * R6.2a.evidence.md through R6.2f.evidence.md, R6.5a/b/d.evidence.md, and
 * A32.evidence.md, D28.evidence.md, D35.evidence.md, D37.evidence.md, and D39.evidence.md. Overlay operands can be mapped to file offsets using
 * byte-backed VROOMM metadata (tools/resolve_dos_overlays.py). Each evidence unit records
 * the targets it verifies; a resolved address alone does not establish the callee's behavior.
 * Older semantic overlay-entry names remain ReMoM attributions unless separately verified.
 */

#include "MOM_DAT.h"

#define NUM_DAMAGE_TYPES            3
#define ST_FALSE                    0
#define ST_TRUE                     1
#define ST_UNDEFINED               (-1)
#define BUS_ACTIVE                  0
#define BUS_UNKNOWN_3               3
#define BUS_DEAD                    4
#define BUS_DRAINED                 5
#define BUS_GONE                    6
#define CONFUSION_SWITCHED_SIDES    2

#define DMG_REGULAR                 0
#define DMG_UNDEATH                 1
#define DMG_IRREVERSIBLE            2
#define BU_DAMAGE_CEILING           200
#define UNIT_WP_GONE                9
#define TEMP_HITS_DISABLED          0
#define WORD_HIGH_BYTE_MASK         0xFF00
#define CP160_IRREVERSIBLE_DAMAGE_CAP 0x00C8
#define COM1_EXTRA_HITS_CAP         0x005A

#define am_Melee                    0
#define am_ThrownOrBreath           1
#define am_Ranged                   2
#define BU_PA_OWN_ATTACK            0
#define BU_PA_COUNTERATTACK         1

#define RAT_CLASS(value)            ((value) / 10)
#define RAT_CLASS_MAGIC             3
#define RAT_MAGIC_FIRST             30
#define RAT_MAGIC_LAST_EXCL         40
#define RAT_NONE                    0
#define RAT_ROCK                    10
#define RAT_CANNON                  11
#define RAT_BOW                     20
#define RAT_SLING                   21
#define RAT_UNKNOWN                 22
#define RAT_LIGHTNING               30
#define RAT_FIREBALL                31
#define RAT_SORCERY                 32
#define RAT_DEATH_BOLT              33
#define RAT_ICE_BOLT                34
#define RAT_PRIEST_SHAMAN           35
#define RAT_DROW                    36
#define RAT_SPRITE                  37
#define RAT_NATURE_BOLT             38
#define RAT_THROWN                  100
#define RAT_FIRE_BREATH             101
#define RAT_LIGHTNING_BREATH        102
#define RAT_STONING_GAZE            103
#define RAT_MULTIPLE_GAZE           104
#define RAT_DEATH_GAZE              105

#define BUE_BLACK_SLEEP             0x0040
#define BUE_HASTE                   0x0800
#define ATT_ARMOR_PIERCING          0x0001
#define ATT_FIRST_STRIKE            0x0002
#define ATT_DOOM_DAMAGE             0x0010
#define ATT_AUTOMATIC_DAMAGE        ATT_DOOM_DAMAGE
#define ATT_POISON                  0x0004
#define ATT_LIFE_STEAL              0x0008
#define ATT_DESTRUCTION             0x0020
#define ATT_ILLUSIONARY             0x0040
#define ATT_STONING_TOUCH           0x0080
#define ATT_DEATH_TOUCH             0x0200
#define ATT_DISPEL_EVIL             0x0800
#define ATT_ELDRITCH_WEAPON         0x4000
#define ATT_DAMAGE_LIMIT            0x2000
#define ATT_SUPERNATURAL            0x2000
#define ATT_AREA                    0x1000
#define ATT_WARP_LIGHTNING          0x8000
#define USA_IMMUNITY_STONING        0x0002
#define USA_IMMUNITY_FIRE           0x0001
#define USA_IMMUNITY_MISSILES       0x0004
#define USA_IMMUNITY_ILLUSION       0x0008
#define USA_IMMUNITY_MAGIC          0x0020
#define USA_IMMUNITY_DEATH          0x0040
#define USA_IMMUNITY_POISON         0x0080
#define USA_IMMUNITY_WEAPON         0x0100
#define USA_UNKNOWN_0200            0x0200
#define USA_UNKNOWN_8000            0x8000
#define USA_HIGH_BYTE(value)        ((uint8_t)(((value) >> 8) & 0xFF))
#define COM1_DEMON_ATTRIBS_1_HIGH   \
    USA_HIGH_BYTE(USA_IMMUNITY_WEAPON | USA_UNKNOWN_0200 | USA_UNKNOWN_8000) /* raw 0x83 */
#define USA_CREATE_UNDEAD_BLOCK_131 USA_IMMUNITY_MAGIC       /* raw 0x0020 */
#define USA_CREATE_UNDEAD_BLOCK_LATER (USA_IMMUNITY_MAGIC | USA_IMMUNITY_DEATH) /* raw 0x0060 */
#define USA2_IMMOLATION             0x08
#define USA2_CAUSE_FEAR             0x20
#define UA_INVISIBILITY             0x0040
#define UA_FANTASTIC                0x0001
#define UA_LARGE_SHIELD             0x0002
#define UA_CREATE_UNDEAD            0x0080
#define UA_LONG_RANGE               0x0100
#define UA_NEGATE_FIRST_STRIKE      0x8000
#define USA_CASTER_20               0x2000
#define USA_CASTER_40               0x4000
#define USA_CASTER_MASK             (USA_CASTER_20 | USA_CASTER_40) /* raw 0x6000 */

#define RANGED_ATTACK_REFUSED       (-5)
#define MOM_HASTE_MANA_FLOOR        6
#define MOM_HASTE_MANA_COST         3
#define COM1_HASTE_MANA_FLOOR       10 /* unreachable arm */
#define COM1_HASTE_MANA_COST        5  /* unreachable arm */
#define COM1_FIRST_STRIKE_HP_CEILING 25
#define UE_BERSERK                  0x00000004UL
#define UE_CLOAK_OF_FEAR            0x00000008UL
#define UE_RESIST_ELEMENTS          0x00000200UL
#define UE_ELEMENTAL_ARMOR          0x00000400UL
#define UE_INVISIBILITY             0x00008000UL
#define UE_SPELL_LOCK               0x00004000UL
#define UE_RESIST_MAGIC             0x00040000UL
#define UE_BLESS                    0x02000000UL
#define UE_TRUE_SIGHT               0x00400000UL
#define UE_RIGHTEOUSNESS            0x40000000UL
#define UE_INVULNERABILITY          0x80000000UL
#define MV_FLYING                   0x0008
#define MV_TELEPORT                 0x0010
#define MV_MERGING                  0x0080
#define MV_UNKNOWN_0800             0x0800 /* CoM 1 Moves2: halve changed movement maximum */
#define MV_UNKNOWN_1000             0x1000 /* CoM 1 Moves2: suppress movement carry-over */
#define RACE_FIRST_FANTASTIC        0x0F
#define RACE_REALM_BIAS             0x10
#define RACE_CHAOS                  0x12
#define RACE_NATURE                 0x10
#define RACE_LIFE                   0x13
#define RACE_DEATH                  0x14
#define rt_Fantastic_No_Realm       0x15
#define HERO_SLOT_NONE              (-1)
#define SPELL_FIREBALL              0x60
#define SPELL_SHATTER               0x58
#define SPELL_RAISE_DEAD            0x89
#define SPELL_CLASS_MUNDANE_CURSE   0x10
#define COMBAT_TARGET_ENEMY_NORMAL  11
#define BUE_SHATTER                 0x0010
#define COM1_SHATTER_CONFLICT_MASK  0x0052
#define SPELL_RECORD_CLASS_OFFSET   0x15
#define SPELL_RECORD_EFFECT_OFFSET  0x20
#define COMBAT_CASTER_UNIT_MAX      19
#define COMBAT_CASTER_PLAYER_BIAS   20
#define HERO_ITEM_SLOTS             3
#define ITEM_RECORD_SIZE            0x32
#define ITEM_SPELL_SAVE_OFFSET      0x2A
#define MOM_SHATTER_RESIST_LIMIT    10
#define COM1_SHATTER_RESIST_LIMIT   8
#define COM1_SHATTER_ATTACK_FLOOR   2
#define SPELL_EARTH_ELEMENTAL       30
#define SPELL_PHANTOM_WARRIORS      45
#define SPELL_PHANTOM_BEAST         60
#define SPELL_AIR_ELEMENTAL         66
#define SPELL_FIRE_ELEMENTAL        90
#define UNIT_TYPE_DEMON             0xA9
#define UNIT_TYPE_CATAPULT          0x25
#define UNIT_TYPE_CENTAURS          0x36
#define UNIT_TYPE_PALADINS          0x71
#define BATTLE_UNIT_RECORD_SIZE     0x006E
#define COMBAT_GRID_WIDTH           0x0015
#define COMBAT_GRID_XMIN            0x0000
#define COMBAT_GRID_XMAX            0x0015
#define COMBAT_GRID_YMIN            0x0000
#define COMBAT_GRID_YMAX            0x0016
#define MOVE_COST_IMPASSABLE        0x00FF
#define MOVEMENT_POINTS_DEAD_SENTINEL (-2) /* raw byte 0xFE */
#define MOVE_ANIM_FRAME_FIRST       1
#define MOVE_ANIM_FRAME_LAST        7
#define MOVE_ANIM_FRAME_COUNT       8
#define AI_CITY_WALLS_UNKNOWN_0001  0x0001 /* raw field value; semantics unresolved */
#define HUMAN_PLAYER_IDX            0
#define FIGURE_SLOT_MAP_BYTES       0x0012
#define COM1_DEMON_SLOT_FLOOR       0x0013
#define COM1_DEMON_GRANT_DICE       4
#define COM1_DEMON_SAVE_MODIFIER    (-4) /* raw byte 0xFC */
#define SPELL_DAMAGE_RANGED_TYPE_MOM  0x26
#define SPELL_DAMAGE_RANGED_TYPE_COM1 0x27
#define INVULNERABILITY_DAMAGE_REDUCTION 2
#define CHECK_RANGED_VISIBLE        0
#define CHECK_RANGED_INVISIBLE      1
#define CHECK_RANGED_DARKNESS       2
#define COM1_DEAD_SPELL_07          7
#define MOM_IMMOLATION_STRENGTH     4
#define COM1_IMMOLATION_STRENGTH    10
#define MOM_RANGED_DISTANCE_DIVISOR 3
#define COM1_RANGED_DISTANCE_DIVISOR 4
#define LONG_RANGE_DISTANCE_PENALTY 1
#define HSA_CHARMED                 0x10000000UL
#define HSA_LEADERSHIP              0x00000001UL
#define HSA_LEADERSHIP2             0x00000002UL
#define HSA_PRAYERMASTER            0x01000000UL
#define HSA_PRAYERMASTER2           0x02000000UL
#define HSA_LEADERSHIP_MASK_LO      0x0003
#define HSA_PRAYERMASTER_MASK_HI    0x0300
#define D10_SIDES                   10
#define ROLL_TARGET_BASE            8
#define COM1_TOBLOCK_DIE_LIMIT      15
#define COM1_DESTRUCTION_FLOOR_GATE 80
#define COM1_HERO_BYTE_0B_FACTOR_2  0x02
#define COM1_HERO_BYTE_0B_FACTOR_3  0x04
#define RAISE_DEAD_NO_SELECTION     (-1) /* raw 0xFFFF */
#define RAISE_DEAD_NAME_BYTES       16
#define RAISE_DEAD_CANDIDATE_SLOTS  8
#define COM1_RAISE_DEAD_NAME_BUFFER 0x83E0
#define COM1_RAISE_DEAD_PROMPT      0x686F
#define GREY_HITS_UNINITIALIZED     (-1) /* raw 0xFF movement-cache sentinel */

#define BLUR_ATTKR                  0x1C
#define BLUR_DFNDR                  0x1D
#define COM1_INVISIBILITY_CHANCE    20
#define COM1_BLUR_CHANCE            20
#define COM1_STACKED_BLUR_CHANCE    30
#define COM1_DESTRUCTION_DAMAGE     100
#define COM1_ATTACK_MARKER_FULL     0x0001
#define WALL_PATCH_X_FIRST          6
#define WALL_PATCH_X_LAST           7
#define WALL_PATCH_Y_FIRST          11
#define WALL_PATCH_Y_LAST           12

#define DEF_SPECIAL_NONE                0
#define DEF_SPECIAL_WEAPON_IMMUNITY     1
#define DEF_SPECIAL_FULL                2
#define MOM_DEFENSE_SPECIAL_VALUE       50
#define COM1_DEFENSE_SPECIAL_VALUE      100
#define MOM_WEAPON_IMMUNITY_FLOOR       10
#define COM1_WEAPON_IMMUNITY_BONUS      8
#define MOM_LARGE_SHIELD_DEFENSE        2
#define COM1_LARGE_SHIELD_DEFENSE       3
#define MOM_BLESS_DEFENSE               3
#define COM1_BLESS_DEFENSE              5
#define MOM_ELEMENTAL_ARMOR_DEFENSE     10
#define COM1_ELEMENTAL_ARMOR_DEFENSE    12
#define MOM_RESIST_ELEMENTS_DEFENSE     3
#define COM1_RESIST_ELEMENTS_DEFENSE    4
#define CITY_WALL_BOX_CGX_FIRST         5
#define CITY_WALL_BOX_CGX_LAST          8
#define CITY_WALL_BOX_CGY_FIRST         10
#define CITY_WALL_BOX_CGY_LAST          13
#define MOM_WALL_OF_FIRE_STRENGTH       0
#define COM1_WALL_OF_FIRE_STRENGTH      10
#define NUM_NODES                       30
#define NF_GUARDIAN                     0x02
#define CITY_ENCHANT_HEAVENLY_LIGHT     0x15

/* R6.5d battlefield aggregation constants and exact DOS data-segment locations. */
#define COMBAT_STRUCTURE_CITY               0x0001
#define BATTLEFIELD_BONUS_SLOTS             7
#define PLAYER_RECORD_BYTES                 0x04C8
#define DSEG_PLAYER_GLOBALS_0                0xA34C
#define PLAYER_GLOBAL_ETERNAL_NIGHT          0x00
#define CITY_ENCHANT_CLOUD_OF_SHADOW         0x06
#define CE_TRUE_LIGHT_DEFENDER               0x01
#define CE_DARKNESS_ATTACKER                 0x02
#define CE_DARKNESS_DEFENDER                 0x03
#define COMBAT_ENCHANTMENT_FROM_CITY         0x02
#define COMBAT_ENCHANTMENT_FROM_GLOBAL       0x03
#define BU_ATTRIBS2_RESIST_ALL               0x40
#define BU_ATTRIBS2_HOLY_BONUS               0x80
#define PRAYER_SOURCE_DEFENDER_SLOT          0
#define PRAYER_SOURCE_OTHER_SLOT             1
#define COM1_SPFX_GROUP_UNKNOWN_0             0
#define COM1_SPFX_GROUP_UNKNOWN_1             1
#define COM1_SPFX_GROUP_UNKNOWN_2             2
#define COM1_SPFX_GROUP_UNKNOWN_3             3
#define COM1_SPFX_GROUP_UNKNOWN_4             4
#define COM1_SPFX_GROUP_BYTES                 7
#define COM1_SPFX_BLOCK_BYTES                 0x23
#define COM1_HERO_BYTE_03_UNKNOWN_40          0x40
#define COM1_HERO_BYTE_04_UNKNOWN_02          0x02
#define COM1_HERO_BYTE_04_UNKNOWN_10          0x10
#define COM1_HERO_BYTE_0B_UNKNOWN_08          0x08
#define COM1_HERO_BYTE_0B_UNKNOWN_10          0x10
#define COM1_HERO_BYTE_0B_UNKNOWN_20          0x20
#define COM1_HERO_BYTE_0B_UNKNOWN_40          0x40

#define DSEG_NUM_PLAYERS                      0xBD9C
#define DSEG_BATTLEFIELD_LEADERSHIP_PTR       0xC896
#define DSEG_BATTLEFIELD_RESIST_PRAYER_PTR    0xC89A
#define DSEG_BATTLEFIELD_HOLY_BONUS_PTR       0xC89E
#define DSEG_PRAYER_SOURCE_FLAGS              0xC7B4
#define DSEG_COM1_SPFX_MAXIMA                 0x3AAC

#define R6_5D_PLAYER_GLOBAL(player, index) \
    (*(int8_t *)(DSEG_PLAYER_GLOBALS_0 + (uint16_t)(player) * PLAYER_RECORD_BYTES + (index)))
#define R6_5D_NUM_PLAYERS (*(int16_t *)DSEG_NUM_PLAYERS)
#define R6_5D_FAR_ARRAY(type, slot) (*(type __far **)(slot))
#define battlefield_leadership_max \
    R6_5D_FAR_ARRAY(int16_t, DSEG_BATTLEFIELD_LEADERSHIP_PTR)
#define battlefield_resist_prayer_max \
    R6_5D_FAR_ARRAY(int16_t, DSEG_BATTLEFIELD_RESIST_PRAYER_PTR)
#define battlefield_holy_bonus_max \
    R6_5D_FAR_ARRAY(int16_t, DSEG_BATTLEFIELD_HOLY_BONUS_PTR)
#define prayer_source_flags ((uint8_t *)DSEG_PRAYER_SOURCE_FLAGS)
#define com1_spfx_max \
    ((int8_t (*)[BATTLEFIELD_BONUS_SLOTS])DSEG_COM1_SPFX_MAXIMA)

/* ReMoM e_SPELL_BOOK_REALM encoding (MOM_DAT.h:729). */
#define sbr_NONE                    (-1)
#define sbr_Nature                  0
#define sbr_Sorcery                 1
#define sbr_Chaos                   2
#define sbr_Life                    3
#define sbr_Death                   4
#define sbr_Arcane                  5
#define sbr_NATURE                  sbr_Nature
#define sbr_CHAOS                   sbr_Chaos
#define sbr_LIFE                    sbr_Life
#define sbr_DEATH                   sbr_Death

/* Exact targets 0388:0043 and 03E0:0043; semantic names attributed by ReMoM. */
extern int16_t __far overlay_0388_0043(int16_t attacker, int16_t defender);
extern void __far overlay_0388_0039(int16_t spell_id, int16_t target_battle_unit_idx,
                                    int16_t damage_types[NUM_DAMAGE_TYPES],
                                    int16_t strength_override);
extern void __far overlay_0388_003E(int16_t battle_unit_idx,
                                    int16_t damage_types[NUM_DAMAGE_TYPES]);
extern void __far overlay_03E0_0043(int16_t attacker);
extern int16_t __far Battle_Unit_Attack_Immunities(int16_t battle_unit_idx,
                                                   int16_t attack_mode);
extern int16_t __far Battle_Unit_Attack_Magic_Realm(int16_t ranged_type_key,
                                                    int16_t battle_unit_idx);
extern int16_t __far Battle_Unit_Has_Ranged_Attack(int16_t battle_unit_idx);
extern int16_t __far Range_To_Battle_Unit(int16_t attacker_battle_unit_idx,
                                         int16_t defender_battle_unit_idx);
extern int16_t __far Combat_Resistance_Check(struct s_BATTLE_UNIT target,
                                             int16_t resist_modifier, int16_t realm);
extern int16_t __far Combat_Effective_Resistance(struct s_BATTLE_UNIT target,
                                                  int16_t realm);
extern int16_t __far BU_CauseFear(int16_t source_battle_unit_idx,
                                  int16_t target_battle_unit_idx);
extern int16_t __far overlay_03E0_0052(int16_t battle_unit_idx);
extern int16_t __far overlay_03E0_0057(int16_t cgx, int16_t cgy);
extern void __far Battle_Unit_Heal(int16_t battle_unit_idx, int16_t amount,
                                   int16_t temp_hits);
extern void __far BU_Construct(struct s_BATTLE_UNIT __far *bu);
extern void __far BU_Apply_Battlefield_Effects(struct s_BATTLE_UNIT __far *bu);
extern void __far Load_Battle_Unit(int16_t unit_idx,
                                   struct s_BATTLE_UNIT __far *bu);
extern int16_t __far Battle_Unit_Pict_Open(void);
extern int16_t __far Combat_Figure_Load(int16_t unit_type, int16_t figure_slot);
extern int16_t __far Random(int16_t faces);
extern int16_t __far CMB_AttackRoll(int16_t strength, int16_t to_hit);
extern int16_t __far CMB_DefenseRoll(int16_t defense, int16_t to_block);
extern int16_t __far Battle_Unit_Defense_Special(int16_t defender_battle_unit_idx,
                                                 int16_t attack_ranged_type,
                                                 int16_t attack_immunities,
                                                 int16_t attack_flags,
                                                 int16_t attack_magic_realm);
extern int16_t __far Eliminated_Opponent(void);
extern int16_t __far Battle_Unit_Is_Summoned_Creature(int16_t battle_unit_idx);
extern void __far Update_Sees_Illusions(void);
extern struct s_SPELL_DATA __far *_SPELL_DATA;
extern int16_t __far Target_Is_Visible(int16_t battle_unit_idx);
extern int16_t __far Spell_Resistance_Modifier(int16_t spell_idx);
extern int16_t __far Effective_Battle_Unit_Strength(int16_t battle_unit_idx);
extern void __far Combat_Spell_Animation(int16_t target_cgx, int16_t target_cgy,
                                         int16_t spell_idx, int16_t player_idx,
                                         int16_t anims_on, int16_t caster_idx);
#if BUILD == COM1
extern void __far Calc_Battlefield_Bonuses(int16_t combat_structure);
extern int16_t _combat_structure;     /* absolute word DS:0xC520 */
extern int16_t __far Calc_Unit_Level(int16_t unit_idx); /* 03C0:008E -> 0x9761F */
extern void __far overlay_0518_0025(void);             /* -> 0xF2840 */
extern void __far overlay_00E0_001A(void);             /* -> 0x1278A */
extern void __far overlay_0318_0020(void);             /* -> 0x767A0 */
extern void __far overlay_0008_0503(void);             /* -> 0x06DC3 */
extern void __far overlay_00E0_0073(void);             /* -> 0x127E3 */
extern char *__far overlay_0000_3C37(char *dst, const char *src); /* -> 0x06637 */
extern int16_t __far overlay_04A8_003E(int16_t arg0, int16_t *arg1,
                                       int16_t arg2, char *arg3); /* -> 0xCF89D */
extern void __far overlay_0428_0066(int16_t arg0, int16_t arg1, int16_t arg2,
                                    int16_t arg3, int16_t arg4); /* -> 0xAF380 */
extern int8_t *com1_combat_grid_rows[]; /* near row pointers at DS:0xC524 */
extern int16_t com1_ai_raise_dead_target; /* DS:0x4995; producer 0xBB30D */
#endif

/* ===========================================================================
 * D28 -- automatic battle-unit movement and version-specific helper at 0390:002A.
 * Complete extent ledgers, the 175-byte CP diff, and incoming Wall-of-Fire edges
 * are in D28.evidence.md.  MoM 1.31 and CP 1.60 only; CoM 1 is outside D28.
 * ======================================================================== */

#if BUILD == MOM131 || BUILD == CP160
#define ADDR_AUTO_COMBAT_FLAG            0xC432
#define ADDR_SOUND_SILENCE               0xC41A
#define ADDR_DEFENDER_SEES_ILLUSIONS     0xC41E
#define ADDR_ATTACKER_SEES_ILLUSIONS     0xC420
#define ADDR_COMBAT_DEFENDER_PLAYER      0xC584
#define ADDR_COMBAT_ATTACKER_PLAYER      0xC586
#define ADDR_COMBAT_TOTAL_UNIT_COUNT     0xC588
#define ADDR_AI_IMMOBILE_COUNTER         0xC8B0
#define ADDR_AI_STAY_IN_CITY             0xC8B2
#define ADDR_AI_BATTLEFIELD_CITY_WALLS   0xC8B4
#define ADDR_MOVEMENT_SCRATCH            0x7082
#define ADDR_MAGIC_SET_SOUND_EFFECTS     0xBD9E
#define ADDR_MAGIC_SET_MOVE_ANIMATIONS   0xBE7E
#define ADDR_WORLD_DATA                  0x9D20
#define ADDR_VORTEX_COUNT                0xD152

/* Far-pointer slots and the near path-length word consumed by Auto_Move_Unit. */
struct s_D28_VORTEX {
    int16_t cgx;
    int16_t cgy;
    uint8_t opaque[8];                  /* record stride 0x0C */
};
#define path_y       (*(int16_t __far **)0xD13E)
#define path_x       (*(int16_t __far **)0xD140)
#define path_length  (*(int16_t *)0xD142)
#define path_cost    (*(uint8_t __far **)0xD146)
#define move_cost_map (*(uint8_t __far **)0xD148)
#define vortices     (*(struct s_D28_VORTEX __far **)0xD14E)

extern void __far Set_Movement_Cost_Map(int16_t battle_unit_idx);
extern void __far Update_Move_Map_City_Area_Restrictions(int16_t battle_unit_idx);
extern void __far AI_Restrict_To_City(void);
extern void __far Combat_Move_Path_Find(int16_t src_cgx, int16_t src_cgy,
                                         int16_t dst_cgx, int16_t dst_cgy);
extern void __far Battle_Unit_Attack(int16_t attacker, int16_t defender,
                                     int16_t arg2, int16_t arg3);
extern void __far BU_Teleport(int16_t battle_unit_idx, int16_t cgx, int16_t cgy);
extern void __far BU_TunnelTo(int16_t battle_unit_idx, int16_t cgx, int16_t cgy);
extern void __far Play_Sound(int16_t sound_seg);
extern void __far Mark_Block(int16_t block);
extern int16_t __far Reload_Battle_Unit_Move_Sound(int16_t battle_unit_idx);
extern void __far Release_Block(int16_t block);
extern void __far Combat_Screen_Draw(void);
extern void __far PageFlip_FX(void);
extern int16_t __far Battle_Unit_In_City_Wall_Box(int16_t battle_unit_idx);
extern void __far Check_Wall_Of_Fire_Attack(int16_t battle_unit_idx);

int16_t __far Auto_Move_Unit(int16_t battle_unit_idx,
                             int16_t dst_cgx, int16_t dst_cgy,
                             int16_t target_battle_unit_idx,
                             int16_t max_x, int16_t max_y)
{
    /* far prologue; 131:0x8A90D..0x8A915  160:=  com1:— */
    int16_t move_anim_speed;
    int16_t first_step_index = 0;
    int16_t move_sound_seg;
    int16_t move_visible;
    int16_t delta_y, delta_x, min_y, min_x;
    int16_t origin_y_2, origin_x_2;
    int16_t first_step, attack_step;
    int16_t last_target_y, last_target_x, origin_y, origin_x;
    int16_t facing_y_offset, facing_x_offset;
    int16_t i, path_i;
#if BUILD == CP160
    int16_t charge_instant_move = ST_FALSE;
                                      /* local [bp-0x28]; 131:—  160:0x8AD0F  com1:— */
#endif

    move_anim_speed = (*(int16_t *)ADDR_AUTO_COMBAT_FLAG == ST_TRUE) ? 2 : 1;
                                      /* CMP/JNE ->0x8A926, then JMP ->0x8A92B
                                       * 131:0x8A918..0x8A92B  160:=  com1:— */
    Set_Movement_Cost_Map(battle_unit_idx);
                                      /* lcall 02D8:002A ->0x6CB64
                                       * 131:0x8A92B..0x8A931  160:=  com1:— */

    for (i = 0; i < *(int16_t *)ADDR_COMBAT_TOTAL_UNIT_COUNT; ++i) {
                                      /* init/JMP ->0x8A98D; JL ->0x8A939
                                       * 131:0x8A932..0x8A937,0x8A98A..0x8A994  160:=  com1:— */
        if (i == target_battle_unit_idx)
                                      /* JE ->0x8A98A  131:0x8A939..0x8A93F  160:=  com1:— */
            continue;
        if (_battle_units[i].status != BUS_ACTIVE)
                                      /* JNE ->0x8A98A  131:0x8A941..0x8A954  160:=  com1:— */
            continue;
        move_cost_map[_battle_units[i].cgy * COMBAT_GRID_WIDTH +
                      _battle_units[i].cgx] = MOVE_COST_IMPASSABLE;
                                      /* C6 07 FF; 131:0x8A956..0x8A987  160:=  com1:— */
    }

    Update_Move_Map_City_Area_Restrictions(battle_unit_idx);
                                      /* lcall 03E0:006B ->0x9E544
                                       * 131:0x8A996..0x8A99C  160:=  com1:— */
    if ((int8_t)_battle_units[battle_unit_idx].controller_idx ==
            *(int16_t *)ADDR_COMBAT_DEFENDER_PLAYER &&
        *(int16_t *)ADDR_AI_STAY_IN_CITY == ST_TRUE &&
        (battlefield->wall_of_fire > 0 || battlefield->wall_of_darkness > 0) &&
        Battle_Unit_In_City_Wall_Box(battle_unit_idx) == ST_TRUE) {
                                      /* JNEs ->0x8A9E5; JG ->0x8A9D4; JLE ->0x8A9E5;
                                       * lcall 03E0:0052 ->0x9EFE3; JNE ->0x8A9E5
                                       * 131:0x8A99D..0x8A9DE  160:=  com1:— */
        AI_Restrict_To_City();        /* lcall 03E0:0075 ->0x9E81B
                                       * 131:0x8A9E0  160:=  com1:— */
    }

    for (i = 0; i < *(int16_t *)ADDR_VORTEX_COUNT; ++i) {
                                      /* init/JMP ->0x8AA22; JL ->0x8A9EC
                                       * 131:0x8A9E5..0x8A9EA,0x8AA1F..0x8AA29  160:=  com1:— */
        move_cost_map[vortices[i].cgy * COMBAT_GRID_WIDTH + vortices[i].cgx] =
            MOVE_COST_IMPASSABLE;    /* C6 07 FF; 131:0x8A9EC..0x8AA1C  160:=  com1:— */
    }

    Combat_Move_Path_Find(_battle_units[battle_unit_idx].cgx,
                          _battle_units[battle_unit_idx].cgy, dst_cgx, dst_cgy);
                                      /* lcall 04D8:0020 ->0xDBC80
                                       * 131:0x8AA2B..0x8AA58  160:=  com1:— */
    if (path_length == 0)
                                      /* JNE ->0x8AA67; 131:0x8AA5B..0x8AA60  160:=  com1:— */
        return ST_FALSE;             /* AX=0; JMP ->epilogue 0x8B307
                                       * 131:0x8AA62..0x8AA64  160:=  com1:— */

    if ((int8_t)_battle_units[battle_unit_idx].controller_idx != HUMAN_PLAYER_IDX)
                                      /* JE ->0x8AA81  131:0x8AA67..0x8AA79  160:=  com1:— */
        *(int16_t *)ADDR_AI_IMMOBILE_COUNTER = ST_UNDEFINED;
                                      /* C7 06 B0 C8 FF FF; 131:0x8AA7B  160:=  com1:— */

    origin_x = _battle_units[battle_unit_idx].cgx;
                                      /* 131:0x8AA81..0x8AA92  160:=  com1:— */
    origin_y = _battle_units[battle_unit_idx].cgy;
                                      /* 131:0x8AA95..0x8AAA6  160:=  com1:— */
    _battle_units[battle_unit_idx].target_cgx = dst_cgx;
                                      /* 131:0x8AAA9..0x8AAB9  160:=  com1:— */
    _battle_units[battle_unit_idx].target_cgy = dst_cgy;
                                      /* 131:0x8AABD..0x8AACD  160:=  com1:— */
    *(int16_t *)ADDR_MOVEMENT_SCRATCH = 0;
                                      /* C7 06 82 70 00 00; 131:0x8AAD1  160:=  com1:— */
    _battle_units[battle_unit_idx].Moving = ST_TRUE;
                                      /* raw +0x52; 131:0x8AAD7..0x8AAE9  160:=  com1:— */
    origin_x_2 = _battle_units[battle_unit_idx].cgx;
                                      /* 131:0x8AAEA..0x8AAFB  160:=  com1:— */
    origin_y_2 = _battle_units[battle_unit_idx].cgy;
                                      /* 131:0x8AAFE..0x8AB0F  160:=  com1:— */

    if (target_battle_unit_idx > ST_UNDEFINED) {
                                      /* JLE ->0x8AB42  131:0x8AB12..0x8AB16  160:=  com1:— */
        dst_cgx = _battle_units[target_battle_unit_idx].cgx;
                                      /* 131:0x8AB18..0x8AB2A  160:=  com1:— */
        dst_cgy = _battle_units[target_battle_unit_idx].cgy;
                                      /* 131:0x8AB2D..0x8AB3F  160:=  com1:— */
    }

    if (max_x == dst_cgx && max_y == dst_cgy) {
                                      /* JNEs ->0x8AB69  131:0x8AB42..0x8AB50  160:=  com1:— */
        min_x = COMBAT_GRID_XMIN;     /* 131:0x8AB52  160:=  com1:— */
        max_x = COMBAT_GRID_XMAX;     /* 131:0x8AB57  160:=  com1:— */
        min_y = COMBAT_GRID_YMIN;     /* 131:0x8AB5C  160:=  com1:— */
        max_y = COMBAT_GRID_YMAX;     /* 131:0x8AB61; JMP ->0x8AC1D  160:=  com1:— */
    } else {
        delta_x = abs(origin_x_2 - dst_cgx);
                                      /* full idiom SUB/PUSH/lcall 0000:02C8 ->0x02CC8
                                       * 131:0x8AB69..0x8AB76  160:=  com1:— */
        delta_y = abs(origin_y_2 - dst_cgy);
                                      /* full idiom SUB/PUSH/lcall 0000:02C8 ->0x02CC8
                                       * 131:0x8AB79..0x8AB86  160:=  com1:— */
        if (delta_x < delta_y) {
                                      /* JGE ->0x8ABB5  131:0x8AB89..0x8AB8F  160:=  com1:— */
            min_x = COMBAT_GRID_XMIN; /* 131:0x8AB91  160:=  com1:— */
            max_x = COMBAT_GRID_XMAX; /* 131:0x8AB96  160:=  com1:— */
            if (origin_y_2 < dst_cgy) /* JGE ->0x8ABAA  131:0x8AB9B..0x8ABA1  160:=  com1:— */
                min_y = COMBAT_GRID_YMIN;
                                      /* 131:0x8ABA3; JMP ->0x8ABB5  160:=  com1:— */
            else {
                min_y = max_y;        /* 131:0x8ABAA  160:=  com1:— */
                max_y = COMBAT_GRID_YMAX;
                                      /* 131:0x8ABB0  160:=  com1:— */
            }
        }
        if (delta_x > delta_y) {
                                      /* JLE ->0x8ABE1  131:0x8ABB5..0x8ABBB  160:=  com1:— */
            min_y = COMBAT_GRID_YMIN; /* 131:0x8ABBD  160:=  com1:— */
            max_y = COMBAT_GRID_YMAX; /* 131:0x8ABC2  160:=  com1:— */
            if (origin_x_2 < dst_cgx) /* JGE ->0x8ABD6  131:0x8ABC7..0x8ABCD  160:=  com1:— */
                min_x = COMBAT_GRID_XMIN;
                                      /* 131:0x8ABCF; JMP ->0x8ABE1  160:=  com1:— */
            else {
                min_x = max_x;        /* 131:0x8ABD6  160:=  com1:— */
                max_x = COMBAT_GRID_XMAX;
                                      /* 131:0x8ABDC  160:=  com1:— */
            }
        }
        if (delta_x == delta_y) {
                                      /* JNE ->0x8AC1D  131:0x8ABE1..0x8ABE7  160:=  com1:— */
            if (origin_x_2 < dst_cgx) /* JGE ->0x8ABF8  131:0x8ABE9..0x8ABEF  160:=  com1:— */
                min_x = COMBAT_GRID_XMIN;
                                      /* 131:0x8ABF1; JMP ->0x8AC03  160:=  com1:— */
            else {
                min_x = max_x;        /* 131:0x8ABF8  160:=  com1:— */
                max_x = COMBAT_GRID_XMAX;
                                      /* 131:0x8ABFE  160:=  com1:— */
            }
            if (origin_y_2 < dst_cgy) /* JGE ->0x8AC12  131:0x8AC03..0x8AC09  160:=  com1:— */
                min_y = COMBAT_GRID_YMIN;
                                      /* 131:0x8AC0B; JMP ->0x8AC1D  160:=  com1:— */
            else {
                min_y = max_y;        /* 131:0x8AC12  160:=  com1:— */
                max_y = COMBAT_GRID_YMAX;
                                      /* 131:0x8AC18  160:=  com1:— */
            }
        }
    }

    first_step = ST_TRUE;             /* 131:0x8AC1D  160:=  com1:— */
    if (((_battle_units[battle_unit_idx].enchantments & UE_INVISIBILITY) ||
         (_battle_units[battle_unit_idx].item_enchantments & UE_INVISIBILITY) ||
         (_battle_units[battle_unit_idx].Abilities & UA_INVISIBILITY) ||
         (_UNITS[_battle_units[battle_unit_idx].unit_idx].enchantments &
             UE_INVISIBILITY)) &&
        (int8_t)_battle_units[battle_unit_idx].controller_idx != HUMAN_PLAYER_IDX) {
                                      /* 32-bit pair masks DX:AX: 81 E2 00 80 / 25 00 00 / OR;
                                       * JNEs ->0x8ACA5, UA TEST 0040, final JE ->0x8AD05;
                                       * controller JE ->0x8AD05
                                       * 131:0x8AC22..0x8ACB7  160:=  com1:— */
        if ((((int8_t)_battle_units[battle_unit_idx].controller_idx ==
                 *(int16_t *)ADDR_COMBAT_ATTACKER_PLAYER) ||
              *(int16_t *)ADDR_ATTACKER_SEES_ILLUSIONS == ST_TRUE) &&
             (((int8_t)_battle_units[battle_unit_idx].controller_idx ==
                 *(int16_t *)ADDR_COMBAT_DEFENDER_PLAYER) ||
              *(int16_t *)ADDR_DEFENDER_SEES_ILLUSIONS == ST_TRUE)))
                                      /* JEs ->0x8ACD8/0x8ACF7; JNEs ->0x8ACFE
                                       * 131:0x8ACB9..0x8ACF5  160:=  com1:— */
            move_visible = ST_TRUE;   /* 131:0x8ACF7; JMP ->0x8AD03  160:=  com1:— */
        else
            move_visible = ST_FALSE;  /* 131:0x8ACFE; JMP ->0x8AD0A  160:=  com1:— */
    } else {
        move_visible = ST_TRUE;       /* 131:0x8AD05  160:=  com1:— */
    }

    first_step_index = 0;             /* 131:0x8AD0A  160:=  com1:— */
#if BUILD == MOM131
    if ((_battle_units[battle_unit_idx].Move_Flags & MV_TELEPORT) ||
        (_battle_units[battle_unit_idx].Move_Flags & MV_MERGING)) {
                                      /* two TESTs, JNE ->0x8AD37 / JE ->0x8AD9E
                                       * 131:0x8AD0F..0x8AD35  160:—  com1:— */
#else
    /* 0x8AD14..0x8AD22 are fifteen NOPs left by the in-place patch. */
    if (_battle_units[battle_unit_idx].Move_Flags & (MV_TELEPORT | MV_MERGING)) {
                                      /* TEST raw 0x90; JE ->0x8AD9E
                                       * 131:—  160:0x8AD14..0x8AD35  com1:— */
#endif
        if (target_battle_unit_idx > ST_UNDEFINED &&
            path_x[path_length - 1] == _battle_units[target_battle_unit_idx].cgx &&
            path_y[path_length - 1] == _battle_units[target_battle_unit_idx].cgy) {
                                      /* JLE/JNE ->0x8AD97
                                       * 131:0x8AD37..0x8AD83  160:=  com1:— */
            if (path_length > 1)      /* JLE ->0x8AD95  131:0x8AD85..0x8AD8A  160:=  com1:— */
                first_step_index = path_length - 2;
                                      /* ADD AX,FFFE; 131:0x8AD8C..0x8AD92  160:=  com1:— */
        } else {
            first_step_index = path_length - 1;
                                      /* 131:0x8AD97..0x8AD9B  160:=  com1:— */
        }
    }

    for (path_i = first_step_index; path_i < path_length; ++path_i) {
                                      /* JMP ->0x8B11E; JGE ->0x8B171
                                       * 131:0x8AD9E..0x8ADA1,0x8B11D..0x8B122  160:=  com1:— */
        if ((path_x[path_i] <= max_x && path_x[path_i] >= min_x &&
             path_y[path_i] <= max_y && path_y[path_i] >= min_y) ||
            (path_x[path_i] == dst_cgx && path_y[path_i] == dst_cgy)) {
                                      /* four range Jccs ->0x8ADE8/0x8AE0D and destination JNE/JE
                                       * 131:0x8ADA4..0x8AE08  160:=  com1:— */
            first_step = ST_FALSE;    /* 131:0x8AE0D  160:=  com1:— */
            _battle_units[battle_unit_idx].target_cgx = path_x[path_i];
                                      /* raw +0x48; 131:0x8AE12..0x8AE2D  160:=  com1:— */
            _battle_units[battle_unit_idx].target_cgy = path_y[path_i];
                                      /* raw +0x4A; 131:0x8AE31..0x8AE4C  160:=  com1:— */
            attack_step = ST_FALSE;   /* 131:0x8AE50  160:=  com1:— */

#if BUILD == CP160
            /* The binary reads mover.target_cgx through inherited ES:BX and forms
             * &_battle_units[target_battle_unit_idx] before comparing the index
             * with -1; only the target dereference below is guarded. */
            if (target_battle_unit_idx != ST_UNDEFINED) {
                                      /* JE ->0x8AEBD  131:—  160:0x8AE55..0x8AE6D  com1:— */
                if (_battle_units[target_battle_unit_idx].status != BUS_ACTIVE)
                                      /* JE ->0x8AE79 else JMP ->0x8B171
                                       * 131:—  160:0x8AE6F..0x8AE78  com1:— */
                    break;
                /* 0x8AE79..0x8AE83: eleven NOPs. */
#endif
                if (_battle_units[battle_unit_idx].target_cgx ==
                        _battle_units[target_battle_unit_idx].cgx &&
                    _battle_units[battle_unit_idx].target_cgy ==
                        _battle_units[target_battle_unit_idx].cgy &&
                    _battle_units[target_battle_unit_idx].status == BUS_ACTIVE)
                                      /* 131: CMP/JNE at 0x8AE55..0x8AEB6;
                                       * 160: CMP/JNE at 0x8AE84..0x8AEB6; all ->0x8AEBD
                                       * 131:0x8AE55  160:0x8AE84  com1:— */
                    attack_step = ST_TRUE;
                                      /* 131:0x8AEB8  160:=  com1:— */
#if BUILD == CP160
            }
#endif

            if (attack_step == ST_TRUE) {
                                      /* JNE ->0x8AF01  131:0x8AEBD..0x8AEC1  160:=  com1:— */
                if (_battle_units[battle_unit_idx].Cur_Figures <= 0)
                                      /* JG ->0x8AEEB  131:0x8AEC3..0x8AED5  160:=  com1:— */
                    _battle_units[battle_unit_idx].movement_points =
                        MOVEMENT_POINTS_DEAD_SENTINEL;
                                      /* C6 47 07 FE; 131:0x8AED7..0x8AEE4  160:=  com1:— */
                else
                    Battle_Unit_Attack(battle_unit_idx, target_battle_unit_idx, 0, 0);
                                      /* lcall 03D0:0052 ->0x9AD04
                                       * 131:0x8AEEB..0x8AEFA  160:=  com1:— */
                --path_i;             /* 131:0x8AEFD; JMP ->0x8B11D  160:=  com1:— */
            } else {
                if ((int8_t)_battle_units[battle_unit_idx].controller_idx ==
                        *(int16_t *)ADDR_COMBAT_DEFENDER_PLAYER &&
                    *(int16_t *)ADDR_AI_BATTLEFIELD_CITY_WALLS ==
                        AI_CITY_WALLS_UNKNOWN_0001 &&
                    !(path_x[path_i] >= CITY_WALL_BOX_CGX_FIRST &&
                      path_x[path_i] <= CITY_WALL_BOX_CGX_LAST &&
                      path_y[path_i] >= CITY_WALL_BOX_CGY_FIRST &&
                      path_y[path_i] <= CITY_WALL_BOX_CGY_LAST) &&
                    Battle_Unit_In_City_Wall_Box(battle_unit_idx) == ST_TRUE)
                                      /* owner/wall JNE ->0x8AF6B; bounds Jcc ->0x8AF5C/0x8AF6B;
                                       * lcall 03E0:0052 ->0x9EFE3; JNE then JMP ->0x8B171
                                       * 131:0x8AF01..0x8AF68  160:=  com1:— */
                    break;

#if BUILD == CP160
                cp_wall_step_and_compare_visibility(battle_unit_idx);
                                      /* E8 DA E4 ->0x89448; 131:—  160:0x8AF6B  com1:— */
                charge_instant_move = ST_TRUE;
                                      /* MOV [bp-0x28],1 preserves helper CMP flags
                                       * 131:—  160:0x8AF6E  com1:— */
                if (move_visible != ST_TRUE)
                                      /* helper CMP; JE ->0x8AF78 else JMP ->0x8B0CC
                                       * 131:—  160:0x8AF73..0x8AF75  com1:— */
                    goto commit_step;
                if (_battle_units[battle_unit_idx].status != BUS_ACTIVE)
                                      /* JNE ->0x8AF75/commit_step
                                       * 131:—  160:0x8AF78..0x8AF8A  com1:— */
                    goto commit_step;
                /* 0x8AF8C..0x8AF97: twelve NOPs. */
                if (_battle_units[battle_unit_idx].Move_Flags & (MV_TELEPORT | MV_MERGING))
                                      /* TEST raw 0x90; JE ->0x8AFA2 else JMP ->0x8B077
                                       * 131:—  160:0x8AF8C..0x8AF9F  com1:— */
                    goto instant_move;
#else
                if (move_visible != ST_TRUE)
                                      /* CMP/JE ->0x8AF74 else JMP ->0x8B0CC
                                       * 131:0x8AF6B..0x8AF71  160:—  com1:— */
                    goto commit_step;
                if (_battle_units[battle_unit_idx].Move_Flags & MV_TELEPORT)
                                      /* TEST/JE ->0x8AF8B else JMP ->0x8B077
                                       * 131:0x8AF74..0x8AF88  160:—  com1:— */
                    goto instant_move;
                if (_battle_units[battle_unit_idx].Move_Flags & MV_MERGING)
                                      /* TEST/JE ->0x8AFA2 else JMP ->0x8B077
                                       * 131:0x8AF8B..0x8AF9F  160:—  com1:— */
                    goto instant_move;
#endif

                if (*(int16_t *)ADDR_MAGIC_SET_SOUND_EFFECTS == ST_TRUE) {
                                      /* JNE ->0x8AFD3  131:0x8AFA2..0x8AFA7  160:=  com1:— */
                    Play_Sound(*(int16_t *)ADDR_SOUND_SILENCE);
                                      /* lcall 0130:076B ->0x2467B
                                       * 131:0x8AFA9..0x8AFB2  160:=  com1:— */
                    Mark_Block(*(int16_t *)ADDR_WORLD_DATA);
                                      /* lcall 0040:0222 ->0x07CC2
                                       * 131:0x8AFB3..0x8AFBC  160:=  com1:— */
                    move_sound_seg = Reload_Battle_Unit_Move_Sound(battle_unit_idx);
                                      /* lcall 03E0:002F ->0x9EC30
                                       * 131:0x8AFBD..0x8AFC4  160:=  com1:— */
                    Release_Block(*(int16_t *)ADDR_WORLD_DATA);
                                      /* lcall 0040:0250 ->0x07CF0
                                       * 131:0x8AFC7..0x8AFD1  160:=  com1:— */
                } else {
                    move_sound_seg = ST_UNDEFINED;
                                      /* 131:0x8AFD3  160:=  com1:— */
                }
                _battle_units[battle_unit_idx].move_anim_ctr = MOVE_ANIM_FRAME_FIRST;
                                      /* raw +0x4C; 131:0x8AFD8..0x8AFE5  160:=  com1:— */
                if (move_sound_seg != ST_UNDEFINED)
                                      /* JE ->0x8AFFA  131:0x8AFEB..0x8AFEF  160:=  com1:— */
                    Play_Sound(move_sound_seg);
                                      /* lcall 0130:076B ->0x2467B
                                       * 131:0x8AFF1..0x8AFF9  160:=  com1:— */

                if (*(int16_t *)ADDR_MAGIC_SET_MOVE_ANIMATIONS == ST_TRUE) {
                                      /* JNE ->0x8B047  131:0x8AFFA..0x8AFFF  160:=  com1:— */
                    for (i = 0; i < MOVE_ANIM_FRAME_COUNT; i += move_anim_speed) {
                                      /* init/JMP ->0x8B03F; JL ->0x8B008
                                       * 131:0x8B001..0x8B006,0x8B039..0x8B043  160:=  com1:— */
                        _battle_units[battle_unit_idx].move_anim_ctr += move_anim_speed;
                                      /* raw +0x4C read/add/write
                                       * 131:0x8B008..0x8B02B  160:=  com1:— */
                        Combat_Screen_Draw();
                                      /* lcall 0318:0020 ->0x767A0  131:0x8B02F  160:=  com1:— */
                        PageFlip_FX();/* lcall 0008:0503 ->0x06DC3  131:0x8B034  160:=  com1:— */
                    }
                } else {
                    _battle_units[battle_unit_idx].move_anim_ctr = MOVE_ANIM_FRAME_LAST;
                                      /* raw +0x4C; 131:0x8B047..0x8B054  160:=  com1:— */
                    Combat_Screen_Draw();
                                      /* lcall 0318:0020 ->0x767A0  131:0x8B05A  160:=  com1:— */
                    PageFlip_FX();    /* lcall 0008:0503 ->0x06DC3  131:0x8B05F  160:=  com1:— */
                }
                if (*(int16_t *)ADDR_MAGIC_SET_SOUND_EFFECTS == ST_TRUE)
                                      /* JNE ->0x8B075  131:0x8B064..0x8B069  160:=  com1:— */
                    Play_Sound(*(int16_t *)ADDR_SOUND_SILENCE);
                                      /* lcall 0130:076B ->0x2467B
                                       * 131:0x8B06B..0x8B074  160:=  com1:— */
                goto commit_step;     /* 131:0x8B075  160:=  com1:— */

instant_move:
                if (_battle_units[battle_unit_idx].Move_Flags & MV_TELEPORT)
                                      /* JE ->0x8B0AB  131:0x8B077..0x8B089  160:=  com1:— */
                    BU_Teleport(battle_unit_idx, path_x[path_i], path_y[path_i]);
                                      /* lcall 0428:005C ->0xAEDF4
                                       * 131:0x8B08B..0x8B0A9  160:=  com1:— */
                else
                    BU_TunnelTo(battle_unit_idx, path_x[path_i], path_y[path_i]);
                                      /* lcall 0428:0061 ->0xAF07F
                                       * 131:0x8B0AB..0x8B0C9  160:=  com1:— */

commit_step:
                _battle_units[battle_unit_idx].move_anim_ctr = 0;
                                      /* raw +0x4C; 131:0x8B0CC..0x8B0D9  160:=  com1:— */
                _battle_units[battle_unit_idx].cgx = path_x[path_i];
                                      /* raw +0x44; 131:0x8B0DF..0x8B0FA  160:=  com1:— */
                _battle_units[battle_unit_idx].cgy = path_y[path_i];
                                      /* raw +0x46; 131:0x8B0FE..0x8B119  160:=  com1:— */
            }
        } else {
            break;                    /* JMP ->0x8B171; 131:0x8AE0A  160:=  com1:— */
        }
        if (path_i + 1 >= path_length)
                                      /* INC; CMP/JGE ->0x8B171
                                       * 131:0x8B11D..0x8B122  160:=  com1:— */
            break;
        if (first_step == ST_TRUE)    /* JNE ->0x8B12D else JMP ->0x8ADA4
                                       * 131:0x8B124..0x8B12A  160:=  com1:— */
            continue;
        if ((int16_t)(int8_t)_battle_units[battle_unit_idx].movement_points -
                (int16_t)(uint8_t)path_cost[path_i] > 0)
                                      /* full idiom: MOV AL,[+07]/CBW; index (DI-1)*2;
                                       * y*0x15+x+path_cost; MOV AL/[AH=0]; SUB DX,AX;
                                       * JLE ->0x8B171 else JMP ->0x8ADA4
                                       * 131:0x8B12D..0x8B16E  160:=  com1:— */
            continue;
        break;
    }

    _battle_units[battle_unit_idx].move_anim_ctr = 0;
                                      /* 131:0x8B171..0x8B17E  160:=  com1:— */
    _battle_units[battle_unit_idx].Moving = ST_FALSE;
                                      /* 131:0x8B184..0x8B191  160:=  com1:— */
    if (path_i > 1) {                /* JLE ->0x8B1DF  131:0x8B197..0x8B19A  160:=  com1:— */
        origin_x = path_x[path_i - 2];
                                      /* 131:0x8B19C..0x8B1AB  160:=  com1:— */
        origin_y = path_y[path_i - 2];
                                      /* 131:0x8B1AE..0x8B1BD  160:=  com1:— */
        last_target_x = path_x[path_i - 1];
                                      /* 131:0x8B1C0..0x8B1CD  160:=  com1:— */
        last_target_y = path_y[path_i - 1];
                                      /* 131:0x8B1D0..0x8B1DD; JMP ->0x8B1E8  160:=  com1:— */
    } else {
        last_target_x = dst_cgx;     /* 131:0x8B1DF..0x8B1E2  160:=  com1:— */
        last_target_y = dst_cgy;     /* 131:0x8B1E5..0x8B1E8  160:=  com1:— */
    }
    facing_x_offset = last_target_x - origin_x;
                                      /* 131:0x8B1EB..0x8B1F1  160:=  com1:— */
    facing_y_offset = last_target_y - origin_y;
                                      /* 131:0x8B1F4..0x8B1FA  160:=  com1:— */
    if (path_i != 0) {               /* JE ->0x8B26F  131:0x8B1FD..0x8B1FF  160:=  com1:— */
        _battle_units[battle_unit_idx].cgx = path_x[path_i - 1];
                                      /* 131:0x8B201..0x8B21D  160:=  com1:— */
        _battle_units[battle_unit_idx].cgy = path_y[path_i - 1];
                                      /* 131:0x8B221..0x8B23D  160:=  com1:— */
        _battle_units[battle_unit_idx].target_cgx = last_target_x + facing_x_offset;
                                      /* 131:0x8B241..0x8B254  160:=  com1:— */
        _battle_units[battle_unit_idx].target_cgy = last_target_y + facing_y_offset;
                                      /* 131:0x8B258..0x8B26B  160:=  com1:— */
    }

    if (!(_battle_units[battle_unit_idx].Move_Flags & MV_TELEPORT) &&
        !(_battle_units[battle_unit_idx].Move_Flags & MV_MERGING)) {
                                      /* JNEs ->0x8B2DB
                                       * 131:0x8B26F..0x8B295  160:=  com1:— */
        _battle_units[battle_unit_idx].movement_points -=
            path_cost[_battle_units[battle_unit_idx].cgy * COMBAT_GRID_WIDTH +
                      _battle_units[battle_unit_idx].cgx];
                                      /* byte SUB AL,[BX]; 131:0x8B297..0x8B2D9  160:=  com1:— */
    } else {
#if BUILD == MOM131
        _battle_units[battle_unit_idx].movement_points -= 2;
                                      /* ADD AL,FE (mod-256 subtract 2)
                                       * 131:0x8B2DB..0x8B2EC  160:—  com1:— */
#else
        if (charge_instant_move == ST_TRUE)
                                      /* JNE ->0x8B2EE; 131:—  160:0x8B2DB..0x8B2E3  com1:— */
            _battle_units[battle_unit_idx].movement_points -= 2;
                                      /* seven NOPs then ADD AL,FE
                                       * 131:—  160:0x8B2E5..0x8B2EC  com1:— */
#endif
    }
    /* common byte store to movement_points +0x07 */
                                      /* 131:0x8B2EE..0x8B2FD  160:=  com1:— */
    return ST_TRUE;                  /* AX=1; JMP ->0x8AA64 then epilogue
                                       * 131:0x8B301..0x8B30C  160:=  com1:— */
}

#if BUILD == MOM131
/* Exported overlay entry 0390:002A in 1.31.  It sorts the first `count`
 * 16-bit battle-unit indices into ascending signed-byte movement_points. */
void __far Sort_Battle_Unit_Indices_By_Movement_Points(int16_t *indices,
                                                        int16_t count)
{
    /* prologue, SI=indices; 131:0x89448..0x8944F  160:—  com1:— */
    int16_t i;
    int8_t j, current_idx, previous_mp, current_mp;
    for (i = 1; i < count; ++i) {
                                      /* init/JMP ->0x894F5; JGE ->0x89500;
                                       * back JMP ->0x8945A
                                       * 131:0x89452..0x89457,0x894F2..0x894FD  160:—  com1:— */
        current_idx = (int8_t)indices[i];
                                      /* low-byte load 8A 00; 131:0x8945A..0x89461  160:—  com1:— */
        j = (int8_t)(i - 1);         /* byte DEC and CL copy; 131:0x89464..0x8946B  160:—  com1:— */
        previous_mp = _battle_units[indices[j]].movement_points;
                                      /* CBW/SHL, index load, *0x6E, +_battle_units, byte load;
                                       * 131:0x8946B..0x89483  160:—  com1:— */
        current_mp = _battle_units[current_idx].movement_points;
                                      /* CBW/*0x6E/byte load; 131:0x89486..0x89499  160:—  com1:— */
        while (j > -1 && previous_mp > current_mp) {
                                      /* JLE ->0x894E2; JG ->0x8949E
                                       * 131:0x894D5..0x894E0  160:—  com1:— */
            indices[j + 1] = indices[j];
                                      /* two sign extensions/index scales and word store 89 00
                                       * 131:0x8949E..0x894B1  160:—  com1:— */
            --j;                     /* 131:0x894B3  160:—  com1:— */
            if (j > -1)              /* JLE ->0x894D5  131:0x894B5..0x894B8  160:—  com1:— */
                previous_mp = _battle_units[indices[j]].movement_points;
                                      /* 131:0x894BA..0x894D2  160:—  com1:— */
        }
        indices[j + 1] = (int16_t)current_idx;
                                      /* CBW/index scale/word store 89 00
                                       * 131:0x894E2..0x894F0  160:—  com1:— */
    }
    /* epilogue/retf; 131:0x89500..0x89504  160:—  com1:— */
}
#endif


/* D37: complete CoM 6.08 post-combat result materialization.
 * Durable control-flow, ABI, write census, and fact/inference evidence:
 * D37.evidence.md. This build-only body covers raw [0x9BCE0,0x9D535). */
#if BUILD == COM1
#define BUS_RECALLED                         0x01
#define BUS_FLEE                             0x02
#define BUS_UNINVOLVED                       0x03
#define BUS_OVERFLOW_REPROCESS               0x0C
#define BUE_CONFUSION                        0x0002
#define BUE_CREATURE_BINDING                 0x2000
#define BUE_POSSESSION                       0x4000
#define UA_CREATE_OUTPOST                    0x0020
#define UA_NONCORPOREAL                      0x0800
#define UA_REGENERATION                      0x2000
#define ATTRIB1_REJECT_MASK                  0x0060
#define ATTRIB1_UNDEAD_MARK                  0x0040
#define UM_UNDEAD                            0x20
#define UE_REGENERATION_LOW                  0x00000040UL
#define UE_MYSTIC_SURGE                      0x00200000UL
#define RACE_ARCANE_BOUND                    0x0F
#define COM1_UNITTYPE_NORMAL_CEILING         0x97 /* R6.1a, Q18 */
#define UNITTYPE_GARGOYLES                   0x9C
#define UNITTYPE_ZOMBIES                     0xAE
#define NEUTRAL_PLAYER                       5
#define HUMAN_PLAYER                         0
#define UNDEAD_DIRECT_ATTRIBUTE_SKILL_GATE   0x00F0
#define MAX_STACK_AFTER_CONVERSION           10
#define MAX_RECOVERED_ITEMS                  18
#define NUM_BUILDINGS                        36
#define NUM_HERO_ITEMS                       3
#define RARE_UNIT_COST                       500
#define FAME_XP_THRESHOLD                    12
#define COMBAT_ENV_ARMY                      0
#define COMBAT_ENV_CITY                      1
#define COMBAT_ENV_LAIR                      5
#define RESULT_MESSAGE_NORMALIZE_ALL         4
#define RESULT_MESSAGE_HIDE_UNDEAD_COUNTS    6
#define PLAYER_GLOBAL_ZOMBIE_MASTERY         2
#define RAIDERS_WON_RESULT                   0x029B
#define RAMPAGE_RUINS_RESULT                 0x029C
#define DIPLO_ACTION_COMBAT                  8
#define KILL_NORMAL                          0
#define KILL_DISAPPEARED                     2
#define MOUSE_LIST_REPLACE                   1

/* 131:—  160:—  com1:0x9BCE0 */
void far End_Of_Combat(int16_t winner, int16_t *item_count,
                       int16_t item_list[], int16_t msg_type)
{
    int16_t i, j, k, survivor_count, experience, zombies, undead;
    int16_t diplomatic_value, lair_secondary_slot_empty, rare_foe, city_loss, destroy_chance;
    int16_t first_neutral_is_fantastic; /* [bp-0x22], intentionally uninitialized */
    int16_t building_lost[NUM_BUILDINGS], hp_delta;
    int16_t human_strength, enemy_lost_strength, human_lost_strength;
    uint32_t enchantments;
    char temp_buffer[10];

    /* 131:—  160:—  com1:0x9BCE8 */ rare_foe = 0;
    /* 131:—  160:—  com1:0x9BCED */ RESULT_MESSAGE_TYPE = msg_type;
    /* 131:—  160:—  com1:0x9BCF3 */ POPULATION_LOST = 0;
    /* 131:—  160:—  com1:0x9BCF9 */ BUILDINGS_LOST_COUNT = 0;
    /* 131:—  160:—  com1:0x9BCFF */ GOLD_REWARD = 0;

    /* 131:—  160:—  com1:0x9BD05 */
    if (winner < HUMAN_PLAYER || winner > NEUTRAL_PLAYER)
        /* 131:—  160:—  com1:0x9BD11 */
        for (i = 0; i < COMBAT_UNIT_COUNT; ++i)
            /* 131:—  160:—  com1:0x9BD15 */
            if (BU(i)->controller_idx == winner)
                /* 131:—  160:—  com1:0x9BD2C */ BU(i)->status = BUS_GONE;

    /* 131:—  160:—  com1:0x9BD45 */ *item_count = 0;
    /* 131:—  160:—  com1:0x9BD4C */ experience = 0;
    /* 131:—  160:—  com1:0x9BD51 */ zombies = 0;
    /* 131:—  160:—  com1:0x9BD56 */ undead = 0;
    /* 131:—  160:—  com1:0x9BD5B */ lair_secondary_slot_empty = 0;
    /* 131:—  160:—  com1:0x9BD60 */
    if (COMBAT_ENVIRONMENT == COMBAT_ENV_LAIR) {
        /* 131:—  160:—  com1:0x9BD67 */ LAIR(COMBAT_ENV_INDEX)->guard1_count &= 0xF0;
        /* 131:—  160:—  com1:0x9BD8F */
        if ((LAIR(COMBAT_ENV_INDEX)->guard2_count & 0x0F) == 0)
            /* 131:—  160:—  com1:0x9BDA4 */ lair_secondary_slot_empty = 1;
        /* 131:—  160:—  com1:0x9BDA9 */ LAIR(COMBAT_ENV_INDEX)->guard2_count &= 0xF0;
    }

    /* 131:—  160:—  com1:0x9BDBC */ bp_helper_zero_three_strength_accumulators();
    /* 131:—  160:—  com1:0x9BDBF */ memset(DS_3AAC, 0, 35);
    /* 131:—  160:—  com1:0x9BDCB */ diplomatic_value = 0;
    /* 131:—  160:—  com1:0x9BDD1 */ survivor_count = 0;

    /* 131:—  160:—  com1:0x9BDD6 */
    for (i = 0; i < COMBAT_UNIT_COUNT; ++i) {
        /* 131:—  160:—  com1:0x9BDDB */
        if (BU(i)->Combat_Effects & BUE_CONFUSION)
            /* CoM patch is unconditional; no owner test remains. */
            /* 131:—  160:—  com1:0x9BDF0 */ BU(i)->status = BUS_GONE;

        /* 131:—  160:—  com1:0x9BE62 */
        if (msg_type == RESULT_MESSAGE_NORMALIZE_ALL || BU(i)->controller_idx == winner) {
            /* 131:—  160:—  com1:0x9BE72 */
            if (BU(i)->status == BUS_UNINVOLVED)
                /* 131:—  160:—  com1:0x9BE86 */ BU(i)->status = BUS_ACTIVE;
        } else {
            /* 131:—  160:—  com1:0x9BE9A */
            if (BU(i)->status == BUS_UNINVOLVED)
                /* 131:—  160:—  com1:0x9BEAE */ BU(i)->status = BUS_FLEE;
        }

        /* 131:—  160:—  com1:0x9BEC0 */
        enchantments = BU(i)->enchantments | UNIT(BU(i)->unit_idx)->enchantments
                     | BU(i)->item_enchantments;

        /* 131:—  160:—  com1:0x9BF1B */
        if (BU(i)->Combat_Effects & (BUE_POSSESSION | BUE_CREATURE_BINDING))
            /* The controller comparison at 0x9BF52 has no branch; CoM always executes this write. */
            /* 131:—  160:—  com1:0x9BF45 */ BU(i)->status = BUS_GONE;

        /* Retained, unreachable after the unconditional jump at 0x9BF6E. */
        /* 131:—  160:—  com1:0x9BF70 */
        if (false) {
            if (BU(i)->controller_idx == COMBAT_ATTACKER)
                /* 131:—  160:—  com1:0x9BF88 */ BU(i)->controller_idx = (int8_t)COMBAT_DEFENDER;
            else
                /* 131:—  160:—  com1:0x9BF9A */ BU(i)->controller_idx = (int8_t)COMBAT_ATTACKER;
        }

        /* 131:—  160:—  com1:0x9BFAE */
        if (BU(i)->status <= BUS_DEAD || BU(i)->status == BUS_FLEE ||
            BU(i)->status == BUS_RECALLED) {
            /* 131:—  160:—  com1:0x9BFED */
            if ((BU(i)->Move_Flags & 0x0100) || (BU(i)->Abilities & UA_REGENERATION) ||
                (enchantments & UE_REGENERATION_LOW)) {
                /* 131:—  160:—  com1:0x9C016 */
                if (BU(i)->controller_idx == winner && BU(i)->status != BUS_RECALLED)
                    /* 131:—  160:—  com1:0x9C02D */ BU(i)->status = BUS_ACTIVE;
                /* 131:—  160:—  com1:0x9C03F */ BU(i)->Cur_Figures = BU(i)->Max_Figures;
                /* 131:—  160:—  com1:0x9C063 */
                BU(i)->enchantments &= ~UE_MYSTIC_SURGE;
                /* 131:—  160:—  com1:0x9C070 */ BU(i)->front_figure_damage = 0;
            }
        }

        /* 131:—  160:—  com1:0x9C083 */
        if (BU(i)->status != BUS_UNINVOLVED) {
            if (BU(i)->controller_idx == HUMAN_PLAYER)
                /* 131:—  160:—  com1:0x9C098 */ human_strength += BU(i)->cost;
            if (BU(i)->status != BUS_ACTIVE) {
                /* 131:—  160:—  com1:0x9C0AC */
                int16_t lost = (BU(i)->status == BUS_FLEE) ? BU(i)->cost / 2 : BU(i)->cost;
                if (BU(i)->controller_idx != HUMAN_PLAYER)
                    /* 131:—  160:—  com1:0x9C0B2 */ enemy_lost_strength += lost;
                else
                    /* 131:—  160:—  com1:0x9C0BC */ human_lost_strength += lost;
            }
        }

        /* 131:—  160:—  com1:0x9C0FC */
        if (BU(i)->enchantments & UE_MYSTIC_SURGE) {
            /* 131:—  160:—  com1:0x9C103 */ BU(i)->Cur_Figures = 1;
            /* 131:—  160:—  com1:0x9C108 */ BU(i)->front_figure_damage = BU(i)->hits - 1;
        }

        /* 131:—  160:—  com1:0x9C163 */
        if (BU(i)->controller_idx == winner && BU(i)->status == BUS_ACTIVE)
            /* 131:—  160:—  com1:0x9C18E */ ++survivor_count;
    }

    /* 131:—  160:—  com1:0x9C19B */ human_strength /= 10;
    /* 131:—  160:—  com1:0x9C1A7 */
    { int16_t pct = human_lost_strength == 0 ? 100
                    : MIN(100, (50 * enemy_lost_strength) / human_lost_strength);
      /* 131:—  160:—  com1:0x9C1BE */ UNKNOWN_DWORD_9F0E += (int32_t)pct * human_strength;
      /* 131:—  160:—  com1:0x9C1C9 */ UNKNOWN_DWORD_A204 += (uint16_t)human_strength; }

    /* 131:—  160:—  com1:0x9C1DC */ produce_drained_candidates_from_item_bit_0x10000000__external_bp_sharing();
reprocess_overflow:
    /* 131:—  160:—  com1:0x9C1DF */ Retreat_From_Combat(winner);
    /* 131:—  160:—  com1:0x9C1E8 */ GUI_MULTIPURPOSE_INT = 0;

    /* 131:—  160:—  com1:0x9C1EE */
    for (i = 0; i < COMBAT_UNIT_COUNT; ++i) {
        /* 131:—  160:—  com1:0x9C1F3 */
        if (BU(i)->controller_idx != winner &&
            !(BU(i)->Abilities & UA_NONCORPOREAL) &&
            BU(i)->status == BUS_DRAINED &&
            !(BU(i)->Combat_Effects & BUE_BLACK_SLEEP) &&
            !(BU(i)->Attribs_1 & ATTRIB1_REJECT_MASK) &&
            UNIT(BU(i)->unit_idx)->Hero_Slot == -1 &&
            (!(BU(i)->attack_attributes & ATT_SUPERNATURAL) ||
             PLAYER(winner)->Nominal_Skill >= UNDEAD_DIRECT_ATTRIBUTE_SKILL_GATE)) {
            /* 131:—  160:—  com1:0x9C2B7 */ BU(i)->Cur_Figures = BU(i)->Max_Figures;
            /* 131:—  160:—  com1:0x9C2CC */ BU(i)->front_figure_damage = 0;
            /* 131:—  160:—  com1:0x9C2D1 */ BU(i)->Attribs_1 |= ATTRIB1_UNDEAD_MARK;
            /* 131:—  160:—  com1:0x9C2D6 */ BU(i)->race = RACE_DEATH;
            /* 131:—  160:—  com1:0x9C2EC */ UNIT(BU(i)->unit_idx)->wx = COMBAT_WX;
            /* 131:—  160:—  com1:0x9C2EF */ UNIT(BU(i)->unit_idx)->Finished = 1;
            /* 131:—  160:—  com1:0x9C2F4 */ UNIT(BU(i)->unit_idx)->moves2 = 0;
            /* 131:—  160:—  com1:0x9C2F9 */ UNIT(BU(i)->unit_idx)->Status = 0;
            /* 8-bit patched add: no carry into the high byte. */
            /* 131:—  160:—  com1:0x9C2FE */ *(uint8_t *)&diplomatic_value += 3;
            /* 131:—  160:—  com1:0x9C305 */ UNIT(BU(i)->unit_idx)->wy = COMBAT_WY;
            /* 131:—  160:—  com1:0x9C30C */ UNIT(BU(i)->unit_idx)->wp = COMBAT_WP;
            /* 131:—  160:—  com1:0x9C313 */ UNIT(BU(i)->unit_idx)->owner_idx = (int8_t)winner;
            /* 131:—  160:—  com1:0x9C355 */ UNIT(BU(i)->unit_idx)->mutations |= UM_UNDEAD;
            /* 131:—  160:—  com1:0x9C369 */ BU(i)->controller_idx = (int8_t)winner;
            /* 131:—  160:—  com1:0x9C36D */ ++undead;
            /* 131:—  160:—  com1:0x9C370 */ ++survivor_count;
            /* 131:—  160:—  com1:0x9C373 */ experience += 2;
            /* 131:—  160:—  com1:0x9C377 */ BU(i)->status = BUS_ACTIVE;
            /* 131:—  160:—  com1:0x9C37C */
            if ((int8_t)(uint8_t)survivor_count >= MAX_STACK_AFTER_CONVERSION) {
                /* 131:—  160:—  com1:0x9C382 */ BU(i)->status = BUS_OVERFLOW_REPROCESS;
                goto reprocess_overflow;
            }
        }

        /* 131:—  160:—  com1:0x9C398 */
        if (PLAYER(winner)->Globals[PLAYER_GLOBAL_ZOMBIE_MASTERY] > 0 && BU(i)->status == BUS_DEAD &&
            !(BU(i)->Attribs_1 & ATTRIB1_REJECT_MASK) && BU(i)->race < RACE_ARCANE_BOUND &&
            UNIT(BU(i)->unit_idx)->Hero_Slot == -1) {
            /* Raw 0x9C3FF comparison with 9 is followed by unconditional JMP 0x9C408. */
            if (BU(i)->controller_idx != winner) {
                /* 131:—  160:—  com1:0x9C41F */ experience += 2;
                /* 8-bit patched add: no carry into the high byte. */
                /* 131:—  160:—  com1:0x9C423 */ *(uint8_t *)&diplomatic_value += 3;
            }
            /* 131:—  160:—  com1:0x9C427 */ ++zombies;
            /* 131:—  160:—  com1:0x9C42A */ BU(i)->race = RACE_DEATH;
            /* 131:—  160:—  com1:0x9C43C */ BU(i)->hits = 3;
            /* 131:—  160:—  com1:0x9C45B */ UNIT(BU(i)->unit_idx)->Sight_Range = 1;
            /* 131:—  160:—  com1:0x9C460 */ UNIT(BU(i)->unit_idx)->type = UNITTYPE_ZOMBIES;
            /* 131:—  160:—  com1:0x9C465 */ UNIT(BU(i)->unit_idx)->Finished = 1;
            /* 131:—  160:—  com1:0x9C46A */ UNIT(BU(i)->unit_idx)->moves2 = 0;
            /* 131:—  160:—  com1:0x9C46F */ UNIT(BU(i)->unit_idx)->Status = 0;
            /* 131:—  160:—  com1:0x9C474 */ UNIT(BU(i)->unit_idx)->owner_idx = (int8_t)winner;
            /* 131:—  160:—  com1:0x9C47B */ UNIT(BU(i)->unit_idx)->XP = 0;
            /* 131:—  160:—  com1:0x9C49C */ UNIT(BU(i)->unit_idx)->Level = 0;
            /* 131:—  160:—  com1:0x9C4BC */ UNIT(BU(i)->unit_idx)->wx = COMBAT_WX;
            /* 131:—  160:—  com1:0x9C4DD */ UNIT(BU(i)->unit_idx)->wy = COMBAT_WY;
            /* 131:—  160:—  com1:0x9C4FF */ UNIT(BU(i)->unit_idx)->wp = COMBAT_WP;
            /* 131:—  160:—  com1:0x9C513 */ BU(i)->Cur_Figures = DS_BYTE_1A29;
            /* 131:—  160:—  com1:0x9C527 */ BU(i)->Max_Figures = DS_BYTE_1A29;
            /* 131:—  160:—  com1:0x9C52E */ BU(i)->controller_idx = (int8_t)winner;
            /* 131:—  160:—  com1:0x9C536 */ BU(i)->status = BUS_ACTIVE;
            /* 131:—  160:—  com1:0x9C53B */ BU(i)->front_figure_damage = 0;
            /* 131:—  160:—  com1:0x9C540 */ ++survivor_count;
            /* 131:—  160:—  com1:0x9C543 */
            if ((int8_t)(uint8_t)survivor_count >= MAX_STACK_AFTER_CONVERSION) {
                /* 131:—  160:—  com1:0x9C549 */ BU(i)->status = BUS_OVERFLOW_REPROCESS;
                goto reprocess_overflow;
            }
        }
    }

    /* 131:—  160:—  com1:0x9C567 */
    if (COMBAT_ENVIRONMENT == COMBAT_ENV_CITY) {
        /* 131:—  160:—  com1:0x9C571 */ POPULATION_LOST = 0;
        /* 131:—  160:—  com1:0x9C577 */ BUILDINGS_LOST_COUNT = 0;
        /* 131:—  160:—  com1:0x9C57D */
        if (winner == COMBAT_ATTACKER) {
            /* 131:—  160:—  com1:0x9C589 */
            if (COMBAT_DEFENDER != NEUTRAL_PLAYER) {
                /* 131:—  160:—  com1:0x9C590 */ PLAYER(COMBAT_DEFENDER)->fame -= CITY(COMBAT_ENV_INDEX)->size;
                /* 131:—  160:—  com1:0x9C5B3 */ PLAYER(COMBAT_DEFENDER)->fame = MAX(0, PLAYER(COMBAT_DEFENDER)->fame);
            }
            /* 131:—  160:—  com1:0x9C5D4 */
            if (COMBAT_DEFENDER == HUMAN_PLAYER)
                /* 131:—  160:—  com1:0x9C5DB */ GUI_MULTIPURPOSE_INT -= CITY(COMBAT_ENV_INDEX)->size;

            /* One call at 0x9C600; 0x9C603 tests its inherited-SI result. */
            /* 131:—  160:—  com1:0x9C600 */
            if (bp_helper_city_requires_automatic_raze()) RAZE_CITY = 1;
            else if (winner == HUMAN_PLAYER) {
                /* 131:—  160:—  com1:0x9C615 */
                if (MAGIC_SET_RAZE_CITY == 1 && Raze_City_Prompt(DS_5EA6) == 0)
                    /* 131:—  160:—  com1:0x9C62C */ RAZE_CITY = 1;
            } else if (winner < NUM_PLAYERS)
                /* 131:—  160:—  com1:0x9C634 */ RAZE_CITY = Raze_Check(winner, COMBAT_ENV_INDEX);

            /* 131:—  160:—  com1:0x9C64E */
            if (!RAZE_CITY) {
                /* 131:—  160:—  com1:0x9C658 */ GOLD_REWARD = MAX(0, CITY(COMBAT_ENV_INDEX)->size - 2);
                /* 131:—  160:—  com1:0x9C67E */ PLAYER(winner)->fame += GOLD_REWARD;
                /* 131:—  160:—  com1:0x9C694 */ if (winner == HUMAN_PLAYER) GUI_MULTIPURPOSE_INT += GOLD_REWARD;
                /* 131:—  160:—  com1:0x9C6A1 */ GOLD_REWARD = 0;
                /* 131:—  160:—  com1:0x9C6AC */
                if (UNKNOWN_WORD_912A == 0) {
                    /* 131:—  160:—  com1:0x9C6B3 */ GOLD_REWARD = City_Gold(COMBAT_ENV_INDEX);
                    /* 131:—  160:—  com1:0x9C6C0 */ if (winner < NUM_PLAYERS) Player_Add_Gold(winner, GOLD_REWARD);
                    /* 131:—  160:—  com1:0x9C6D7 */
                    if (CITY(COMBAT_ENV_INDEX)->owner_idx < NUM_PLAYERS)
                        PLAYER(COMBAT_DEFENDER)->gold_reserve -= GOLD_REWARD;
                }
            } else {
                /* CoM raw adds, rather than subtracts, both summary and fame. */
                /* 131:—  160:—  com1:0x9C705 */ GOLD_REWARD = CITY(COMBAT_ENV_INDEX)->size;
                /* 131:—  160:—  com1:0x9C71B */ if (winner == HUMAN_PLAYER) GUI_MULTIPURPOSE_INT += GOLD_REWARD;
                /* 131:—  160:—  com1:0x9C728 */ PLAYER(winner)->fame += GOLD_REWARD;
                /* 131:—  160:—  com1:0x9C73A */ PLAYER(winner)->fame = MAX(0, PLAYER(winner)->fame);
                /* 131:—  160:—  com1:0x9C747 */ GOLD_REWARD = 0;
                /* 131:—  160:—  com1:0x9C74D */
                if (UNKNOWN_WORD_912A == 0) {
                    /* 131:—  160:—  com1:0x9C75B */ GOLD_REWARD = City_Gold(COMBAT_ENV_INDEX);
                    /* 131:—  160:—  com1:0x9C768 */
                    if (CITY(COMBAT_ENV_INDEX)->owner_idx < NUM_PLAYERS)
                        PLAYER(COMBAT_DEFENDER)->gold_reserve -= GOLD_REWARD;
                    /* 131:—  160:—  com1:0x9C793 */
                    for (i = 3; i < NUM_BUILDINGS; ++i)
                        /* 131:—  160:—  com1:0x9C798 */
                        if (CITY(COMBAT_ENV_INDEX)->bldg_status[i] > -1)
                            GOLD_REWARD += BUILDING_TABLE[i].construction_cost / 10;
                    /* 131:—  160:—  com1:0x9C7D0 */
                    if (winner < NUM_PLAYERS) Player_Add_Gold(winner, GOLD_REWARD);
                }
            }
        } else {
            /* 131:—  160:—  com1:0x9C7E9 */ GOLD_REWARD = 0;
        }

        /* 131:—  160:—  com1:0x9C7EF */
        if (CITY(COMBAT_ENV_INDEX)->population != 0) {
            /* 131:—  160:—  com1:0x9C807 */ int16_t population_pct = COMBAT_CITY_DAMAGE * 2;
            /* 131:—  160:—  com1:0x9C80F */
            if (winner == COMBAT_ATTACKER) {
                if (winner == NEUTRAL_PLAYER) {
                    /* 131:—  160:—  com1:0x9C81E */
                    for (i = 0; i < COMBAT_UNIT_COUNT; ++i) {
                        /* 131:—  160:—  com1:0x9C822 */
                        if (BU(i)->controller_idx == NEUTRAL_PLAYER) {
                            /* 131:—  160:—  com1:0x9C836 */
                            first_neutral_is_fantastic = (BU(i)->Abilities & 1) != 0;
                            /* Both assignment arms jump out at 0x9C850/0x9C857. */
                            break;
                        }
                    }
                    /* 131:—  160:—  com1:0x9C860 */
                    if (first_neutral_is_fantastic == 1) {
                        /* 131:—  160:—  com1:0x9C866 */ population_pct += 50;
                        /* 131:—  160:—  com1:0x9C86A */ ACTIVE_BATTLE_UNIT = Rampage_Combat_City();
                    } else
                        /* 131:—  160:—  com1:0x9C874 */ ACTIVE_BATTLE_UNIT = RAIDERS_WON_RESULT;
                } else
                    /* 131:—  160:—  com1:0x9C87C */ population_pct += 10;
            }
            /* 131:—  160:—  com1:0x9C880 */ population_pct = MIN(population_pct, 50);
            /* 131:—  160:—  com1:0x9C88B */ city_loss = 0;
            /* 131:—  160:—  com1:0x9C88D */
            for (i = 0; i < CITY(COMBAT_ENV_INDEX)->population - 1; ++i)
                /* 131:—  160:—  com1:0x9C891 */ if (Random(100) <= population_pct) ++city_loss;
            /* 131:—  160:—  com1:0x9C8BA */
            for (i = 0; i < NUM_BUILDINGS; ++i) building_lost[i] = 0;
            /* 131:—  160:—  com1:0x9C8D1 */ destroy_chance = COMBAT_CITY_DAMAGE;
            /* 131:—  160:—  com1:0x9C8D7 */
            if (winner == COMBAT_ATTACKER) {
                if (winner == NEUTRAL_PLAYER)
                    /* 131:—  160:—  com1:0x9C8E6 */ destroy_chance += 50;
                else
                    /* 131:—  160:—  com1:0x9C8EC */ bp_helper_add_difficulty_destruction_bonus();
            }
            /* 131:—  160:—  com1:0x9C8F0 */ destroy_chance = MIN(destroy_chance, 75);
            /* 131:—  160:—  com1:0x9C8FB */
            if (ACTIVE_BATTLE_UNIT != RAMPAGE_RUINS_RESULT)
                /* 131:—  160:—  com1:0x9C903 */
                Apply_Damage_To_City(COMBAT_ENV_INDEX, city_loss, destroy_chance, building_lost);

            /* 0x9C917 performs a dead winner/defender comparison; 0x9C91E then jumps over
               the retained message-compaction island unconditionally. */
            if (false) {
                /* 131:—  160:—  com1:0x9C920 */
                for (i = 0; i < BUILDING_COMPLETION_MESSAGE_COUNT; ++i) {
                    /* 131:—  160:—  com1:0x9C924 */
                    if (BUILDING_COMPLETION_MESSAGE_CITY[i] == COMBAT_ENV_INDEX) {
                        /* 131:—  160:—  com1:0x9C935 */
                        for (j = i; j < BUILDING_COMPLETION_MESSAGE_COUNT; ++j)
                            /* Copies the next record's city byte over the current record. */
                            /* 131:—  160:—  com1:0x9C939 */
                            BUILDING_COMPLETION_MESSAGE_CITY[j] =
                                BUILDING_COMPLETION_MESSAGE_CITY[j + 1];
                        /* 131:—  160:—  com1:0x9C956 */
                        --BUILDING_COMPLETION_MESSAGE_COUNT;
                    }
                }
            }

            /* 131:—  160:—  com1:0x9C967 */ BUILDINGS_LOST_COUNT = 0;
            /* 131:—  160:—  com1:0x9C96D */
            for (i = 0; i < NUM_BUILDINGS; ++i)
                /* 131:—  160:—  com1:0x9C971 */ if (building_lost[i] > 0) ++BUILDINGS_LOST_COUNT;
            /* 131:—  160:—  com1:0x9C989 */ POPULATION_LOST = city_loss;
            /* The published near pointer expires when this far frame returns. */
            /* 131:—  160:—  com1:0x9C98D */ LOST_BUILDINGS_PTR = building_lost;
        }
    }

    /* 131:—  160:—  com1:0x9C993 */
    for (i = 0; i < COMBAT_UNIT_COUNT; ++i) {
        /* 131:—  160:—  com1:0x9C998 */
        if (COMBAT_ENVIRONMENT == COMBAT_ENV_LAIR && winner == NEUTRAL_PLAYER &&
            BU(i)->controller_idx == NEUTRAL_PLAYER && BU(i)->status == BUS_ACTIVE) {
            /* 131:—  160:—  com1:0x9C9D9 */
            if (UNIT(BU(i)->unit_idx)->type == LAIR(COMBAT_ENV_INDEX)->guard1_unit_type) {
                /* 131:—  160:—  com1:0x9CA14 */ ++LAIR(COMBAT_ENV_INDEX)->guard1_count;
                /* 131:—  160:—  com1:0x9CA3C */ BU(i)->status = BUS_DEAD;
            } else if (UNIT(BU(i)->unit_idx)->type == LAIR(COMBAT_ENV_INDEX)->guard2_unit_type) {
                /* 131:—  160:—  com1:0x9CA8C */ ++LAIR(COMBAT_ENV_INDEX)->guard2_count;
                /* 131:—  160:—  com1:0x9CAB4 */ BU(i)->status = BUS_DEAD;
            } else if (lair_secondary_slot_empty == 1) {
                /* 131:—  160:—  com1:0x9CACF */ LAIR(COMBAT_ENV_INDEX)->guard2_unit_type = UNIT(BU(i)->unit_idx)->type;
                /* 131:—  160:—  com1:0x9CB02 */ LAIR(COMBAT_ENV_INDEX)->guard2_count += 0x11;
                /* 131:—  160:—  com1:0x9CB2A */ BU(i)->status = BUS_DEAD;
                /* 131:—  160:—  com1:0x9CB3C */ lair_secondary_slot_empty = 0;
            } else
                /* 131:—  160:—  com1:0x9CB43 */ BU(i)->status = BUS_DEAD;
        }

        /* 131:—  160:—  com1:0x9CB55 */
        if (msg_type >= RESULT_MESSAGE_HIDE_UNDEAD_COUNTS) { zombies = 0; undead = 0; }

        /* Exact dead/removal admission, including neutral-environment exceptions. */
        /* 131:—  160:—  com1:0x9CB67 */
        bool remove = BU(i)->status > BUS_ACTIVE || UNIT(BU(i)->unit_idx)->wp == UNIT_WP_GONE;
        /* 131:—  160:—  com1:0x9CBAB */
        if (!remove && UNIT(BU(i)->unit_idx)->owner_idx == NEUTRAL_PLAYER) {
            if (COMBAT_ENVIRONMENT != 0) {
                if (COMBAT_ENVIRONMENT != 1) remove = true;
                else if (BU(i)->race >= RACE_ARCANE_BOUND && winner == NEUTRAL_PLAYER) remove = true;
            }
        }

        /* 131:—  160:—  com1:0x9CBDE */
        if (remove) {
            if (BU(i)->controller_idx != winner) {
                /* 131:—  160:—  com1:0x9CBF5 */
                experience += 1 + ((BU(i)->cost >> 5) /
                              (((uint8_t)COMBAT_ATTACKER == NEUTRAL_PLAYER ||
                                (uint8_t)COMBAT_DEFENDER == NEUTRAL_PLAYER) ? 2 : 1));
                /* 131:—  160:—  com1:0x9CC13 */
                if (UNIT_TYPE_TABLE[UNIT(BU(i)->unit_idx)->type].cost >= RARE_UNIT_COST) rare_foe = 1;
            }
            /* 131:—  160:—  com1:0x9CC3B */
            if (BU(i)->controller_idx == COMBAT_DEFENDER &&
                UNIT(BU(i)->unit_idx)->wp != UNIT_WP_GONE) {
                if (UNIT(BU(i)->unit_idx)->Hero_Slot > -1)
                    /* 131:—  160:—  com1:0x9CC8D */ diplomatic_value += 30;
                else {
                    /* 131:—  160:—  com1:0x9CC93 */ diplomatic_value += Random(5);
                    /* 131:—  160:—  com1:0x9CCA0 */
                    if (BU(i)->Construction > 0 || (BU(i)->Abilities & UA_CREATE_OUTPOST))
                        /* 131:—  160:—  com1:0x9CCC9 */ diplomatic_value += Random(20);
                }
            }

            /* 131:—  160:—  com1:0x9CCD6 */
            if (UNIT(BU(i)->unit_idx)->Hero_Slot > -1) {
                /* 131:—  160:—  com1:0x9CCFB */
                for (j = 0; j < NUM_HERO_ITEMS; ++j) {
                    int16_t *slot = HERO_ITEM_SLOT(UNIT(BU(i)->unit_idx)->owner_idx,
                                                  UNIT(BU(i)->unit_idx)->Hero_Slot, j);
                    /* 131:—  160:—  com1:0x9CD00 */
                    if (*slot > -1) {
                        if (BU(i)->status == BUS_GONE)
                            /* 131:—  160:—  com1:0x9CD72 */ Remove_Item(*slot);
                        else if (*item_count < MAX_RECOVERED_ITEMS) {
                            /* 131:—  160:—  com1:0x9CDDB */ item_list[*item_count] = *slot;
                            /* 131:—  160:—  com1:0x9CE41 */ ++*item_count;
                        } else
                            /* 131:—  160:—  com1:0x9CE4E */ Remove_Item(*slot);
                    }
                    /* 131:—  160:—  com1:0x9CEAC */ *slot = -1;
                }

                /* 131:—  160:—  com1:0x9CF0F */
                if (BU(i)->controller_idx != winner) {
                    int16_t fame_loss = (UNIT(BU(i)->unit_idx)->Level + 1) / 2;
                    /* 131:—  160:—  com1:0x9CF29 */
                    if (BU(i)->controller_idx == HUMAN_PLAYER) GUI_MULTIPURPOSE_INT -= fame_loss;
                    /* 131:—  160:—  com1:0x9CF67 */ PLAYER(BU(i)->controller_idx)->fame -= fame_loss;
                }
            }

            /* 131:—  160:—  com1:0x9CFAC */
            Kill_Unit(BU(i)->unit_idx,
                      (BU(i)->status == BUS_GONE || (UNIT(BU(i)->unit_idx)->mutations & UM_UNDEAD))
                      ? KILL_DISAPPEARED : KILL_NORMAL);
        } else {
            /* 131:—  160:—  com1:0x9D005 */ BU(i)->front_figure_damage = MAX(0, BU(i)->front_figure_damage);
            /* 131:—  160:—  com1:0x9D02B */ BU(i)->Extra_Hits = 0;
            /* 131:—  160:—  com1:0x9D03D */ BU(i)->enchantments = 0;
            /* 131:—  160:—  com1:0x9D056 */ hp_delta = Battle_Unit_Hit_Points(BU(i));
            /* 131:—  160:—  com1:0x9D072 */ hp_delta -= BU(i)->hits;
            /* 131:—  160:—  com1:0x9D08A */ BU(i)->front_figure_damage -= hp_delta;
            /* 131:—  160:—  com1:0x9D0B1 */ BU(i)->front_figure_damage = MAX(0, BU(i)->front_figure_damage);
            /* 131:—  160:—  com1:0x9D0D7 */
            UNIT(BU(i)->unit_idx)->Damage =
                (BU(i)->Max_Figures - BU(i)->Cur_Figures) * (BU(i)->hits - hp_delta)
                + BU(i)->front_figure_damage;
            /* 131:—  160:—  com1:0x9D152 */
            if (UNIT(BU(i)->unit_idx)->owner_idx != winner)
                /* 131:—  160:—  com1:0x9D16D */ UNIT(BU(i)->unit_idx)->moves2 = 0;
        }
    }

    /* 131:—  160:—  com1:0x9D17C */
    if (COMBAT_DEFENDER != HUMAN_PLAYER && COMBAT_DEFENDER != NEUTRAL_PLAYER &&
        COMBAT_ATTACKER != NEUTRAL_PLAYER)
        /* 131:—  160:—  com1:0x9D191 */
        Change_Relations(-diplomatic_value, COMBAT_ATTACKER, COMBAT_DEFENDER,
                         DIPLO_ACTION_COMBAT, 0, 0);

    /* 131:—  160:—  com1:0x9D1B1 */
    if (COMBAT_ENVIRONMENT == COMBAT_ENV_LAIR && winner == NEUTRAL_PLAYER) {
        /* 131:—  160:—  com1:0x9D1C4 */
        if ((LAIR(COMBAT_ENV_INDEX)->guard1_count & 0x0F) == 0 &&
            (LAIR(COMBAT_ENV_INDEX)->guard2_count & 0x0F) > 0) {
            /* 131:—  160:—  com1:0x9D1F5 */ LAIR(COMBAT_ENV_INDEX)->guard1_count = LAIR(COMBAT_ENV_INDEX)->guard2_count;
            /* 131:—  160:—  com1:0x9D21B */ LAIR(COMBAT_ENV_INDEX)->guard1_unit_type = LAIR(COMBAT_ENV_INDEX)->guard2_unit_type;
            /* 131:—  160:—  com1:0x9D241 */ LAIR(COMBAT_ENV_INDEX)->guard2_count = 0;
            /* 131:—  160:—  com1:0x9D254 */ LAIR(COMBAT_ENV_INDEX)->guard2_unit_type = UNITTYPE_GARGOYLES;
        }
        /* 131:—  160:—  com1:0x9D267 */
        if (undead > 0 && LAIR(COMBAT_ENV_INDEX)->guard1_unit_type >= COM1_UNITTYPE_NORMAL_CEILING &&
            LAIR(COMBAT_ENV_INDEX)->guard2_unit_type >= COM1_UNITTYPE_NORMAL_CEILING)
            /* 131:—  160:—  com1:0x9D297 */ undead = 0;
    }

    /* 131:—  160:—  com1:0x9D29C */
    if (winner != NEUTRAL_PLAYER && experience >= FAME_XP_THRESHOLD) {
        /* 131:—  160:—  com1:0x9D2AE */ if (winner == HUMAN_PLAYER) ++GUI_MULTIPURPOSE_INT;
        /* 131:—  160:—  com1:0x9D2B8 */ ++PLAYER(winner)->fame;
        /* 131:—  160:—  com1:0x9D2D7 */
        if (winner == COMBAT_ATTACKER) {
            /* 131:—  160:—  com1:0x9D2E0 */
            if (PLAYER(COMBAT_DEFENDER)->fame > 20) {
                /* 131:—  160:—  com1:0x9D2F1 */ if (COMBAT_DEFENDER == HUMAN_PLAYER) --GUI_MULTIPURPOSE_INT;
                /* 131:—  160:—  com1:0x9D2FC */ --PLAYER(COMBAT_DEFENDER)->fame;
            }
        } else if (PLAYER(COMBAT_ATTACKER)->fame > 20) { /* com1:0x9D30C */
            /* 131:—  160:—  com1:0x9D31D */ if (COMBAT_ATTACKER == HUMAN_PLAYER) --GUI_MULTIPURPOSE_INT;
            /* 131:—  160:—  com1:0x9D328 */ --PLAYER(COMBAT_ATTACKER)->fame;
        }
    }
    /* 131:—  160:—  com1:0x9D336 */ if (winner == HUMAN_PLAYER) GUI_MULTIPURPOSE_INT += rare_foe;
    /* 131:—  160:—  com1:0x9D343 */ PLAYER(winner)->fame += rare_foe;
    /* 131:—  160:—  com1:0x9D354 */
    if (COMBAT_ATTACKER == HUMAN_PLAYER || COMBAT_DEFENDER == HUMAN_PLAYER)
        /* 131:—  160:—  com1:0x9D362 */ Combat_Results_Scroll();

    /* 131:—  160:—  com1:0x9D367 */
    for (i = 0; i < COMBAT_UNIT_COUNT; ++i)
        /* 131:—  160:—  com1:0x9D36C */
        if (BU(i)->status == BUS_ACTIVE && UNIT(BU(i)->unit_idx)->type < COM1_UNITTYPE_NORMAL_CEILING &&
            /* 0x9D385 loads BU race into CL but no later instruction consumes it. */
            !(UNIT(BU(i)->unit_idx)->mutations & UM_UNDEAD) &&
            BU(i)->controller_idx == (uint8_t)winner)
            /* 131:—  160:—  com1:0x9D3B3 */ bp_helper_add_experience_to_unit(experience);

    /* 131:—  160:—  com1:0x9D3F9 */
    if (COMBAT_ATTACKER == HUMAN_PLAYER || COMBAT_DEFENDER == HUMAN_PLAYER) {
        /* 131:—  160:—  com1:0x9D40A */
        if (zombies > 0) {
            /* 131:—  160:—  com1:0x9D410 */ itoa(zombies, temp_buffer, 10);
            /* 131:—  160:—  com1:0x9D423 */ strcpy(GUI_NEAR_MSG, temp_buffer);
            /* 131:—  160:—  com1:0x9D432 */ strcat(GUI_NEAR_MSG, zombies > 1 ? DS_5ED3 : DS_5EDF);
            /* 131:—  160:—  com1:0x9D44C */ strcat(GUI_NEAR_MSG, DS_5EE9);
            /* 131:—  160:—  com1:0x9D45B */ Undead_Animation(UNITTYPE_ZOMBIES);
        }
        /* 131:—  160:—  com1:0x9D465 */
        if (undead > 0) {
            /* 131:—  160:—  com1:0x9D46E */ itoa(undead, temp_buffer, 10);
            /* 131:—  160:—  com1:0x9D481 */ strcpy(GUI_NEAR_MSG, temp_buffer);
            /* 131:—  160:—  com1:0x9D490 */ strcat(GUI_NEAR_MSG, undead > 1 ? DS_5F09 : DS_5F2D);
            /* 131:—  160:—  com1:0x9D4AA */
            if (winner == HUMAN_PLAYER) strcat(GUI_NEAR_MSG, DS_5F51);
            else if (winner == NEUTRAL_PLAYER)
                /* 131:—  160:—  com1:0x9D4EF */ strcat(GUI_NEAR_MSG, undead > 1 ? DS_5F56 : DS_5F66);
            else {
                /* 131:—  160:—  com1:0x9D4C7 */ strcat(GUI_NEAR_MSG, PLAYER(winner)->name);
                /* 131:—  160:—  com1:0x9D4DE */ strcat(GUI_NEAR_MSG, DS_5F07);
            }
            /* 131:—  160:—  com1:0x9D509 */
            Undead_Animation(excluded_next_routine_at_0x9D535(winner));
        }
    }
    /* 131:—  160:—  com1:0x9D519 */
    if (COMBAT_ATTACKER != HUMAN_PLAYER)
        /* 131:—  160:—  com1:0x9D520 */ Set_Mouse_List(MOUSE_LIST_REPLACE, DS_0106);
}

/* BP-sharing helper; live caller 0x9D3B6. */
/* 131:—  160:—  com1:0x9BE04 */
static near void bp_helper_add_experience_to_unit(int16_t amount_in_ax)
{
    /* inherited BX = current s_UNIT, BP = End_Of_Combat frame */
    /* 131:—  160:—  com1:0x9BE04 */
    if (winner != HUMAN_PLAYER && UNIT_IN_BX->Hero_Slot > -1)
        /* 131:—  160:—  com1:0x9BE11 */ amount_in_ax = (amount_in_ax * DIFFICULTY) >> 1;
    /* 131:—  160:—  com1:0x9BE1B */ UNIT_IN_BX->XP += amount_in_ax;
    /* 131:—  160:—  com1:0x9BE1F */ return;
}

/* BP-sharing helper; live caller 0x9BDBC. */
/* 131:—  160:—  com1:0x9C077 */
static near void bp_helper_zero_three_strength_accumulators(void)
{
    /* 131:—  160:—  com1:0x9C077 */ human_strength = enemy_lost_strength = human_lost_strength = 0;
    /* 131:—  160:—  com1:0x9C082 */ return;
}

/* BP-sharing helper; live caller 0x9C600, returns in inherited SI. */
/* 131:—  160:—  com1:0x9C0C1 */
static near int16_t bp_helper_city_requires_automatic_raze(void)
{
    /* 131:—  160:—  com1:0x9C0C1 */
    uint8_t unused_cl = PLAYER(COMBAT_ATTACKER)->UNKNOWN_0068; /* executed read, base+0x68 */
    /* 131:—  160:—  com1:0x9C0CA */
    uint8_t unused_ch = PLAYER(COMBAT_ATTACKER)->UNKNOWN_0015; /* executed read, base+0x15 */
    /* 131:—  160:—  com1:0x9C0D2 */ i = 0;
    /* 131:—  160:—  com1:0x9C0E1 */ if (CITY(COMBAT_ENV_INDEX)->population == 0) ++i;
    /* 0x9C0E9 executes a dead attacker comparison; 0x9C0EE jumps directly to RET. */
    (void)(COMBAT_ATTACKER != NEUTRAL_PLAYER);
    /* Retained patched-out residue at 0x9C0F0..0x9C0FA. */
    if (false && unused_cl != 0 && unused_ch != CITY(COMBAT_ENV_INDEX)->race) ++i;
    /* 131:—  160:—  com1:0x9C0FB */ return i;
}

/* BP-sharing helper; live caller 0x9C8EC. */
/* 131:—  160:—  com1:0x9C114 */
static near void bp_helper_add_difficulty_destruction_bonus(void)
{
    /* 131:—  160:—  com1:0x9C114 */ destroy_chance += CS_DIFFICULTY_BONUS[DIFFICULTY];
    /* 131:—  160:—  com1:0x9C121 */ return;
}
/* 131:—  160:—  com1:0x9C122 */
static const uint8_t CS_DIFFICULTY_BONUS[7] = {0x0A,0x14,0x14,0x1C,0x23,0x28,0x2D};
#endif


#if BUILD == CP160
/* Near BP-sharing helper called only from Auto_Move_Unit.  It has no prologue:
 * SI is the parent's battle_unit_idx and BP is the parent's frame. */
static void cp_wall_step_and_compare_visibility(int16_t implicit_si)
{
    Check_Wall_Of_Fire_Attack(implicit_si);
                                      /* PUSH SI; lcall 03E0:0043 ->0x9EDAA; POP CX
                                       * 131:—  160:0x89448..0x8944E  com1:— */
    /* Return flags are those from CMP parent [bp-0x20],1. */
                                      /* 83 7E E0 01 / C3; 131:—  160:0x8944F..0x89453  com1:— */
}
#endif
#endif /* BUILD == MOM131 || BUILD == CP160 */


/* ===========================================================================
 * A32 -- Shatter target admission and generic effect setter.
 * Complete extent ledgers and cross-build differences are in A32.evidence.md.
 * These are source-shaped excerpts of three larger overlay routines.
 * ======================================================================== */

static uint8_t A32_spell_class(int16_t spell_idx)
{
    return *((uint8_t __far *)&_SPELL_DATA[spell_idx] + SPELL_RECORD_CLASS_OFFSET);
}

static uint16_t A32_spell_effect_mask(int16_t spell_idx)
{
    return *((uint16_t __far *)((uint8_t __far *)&_SPELL_DATA[spell_idx]
                                + SPELL_RECORD_EFFECT_OFFSET));
}

#if BUILD == COM1
extern uint8_t __far *_ITEMS; /* ITEM_RECORD_SIZE records; spell_save at ITEM_SPELL_SAVE_OFFSET. */

/* Near callee shares AITP_Combat_Spell's frame; com1:0x80338 -> 0x8156A. */
static void __near A32_com1_prepare_ai_context(int16_t caster_idx,
                                               int16_t *player_idx,
                                               int16_t *item_spell_save_adjust,
                                               int16_t *picked_target)
{
    int16_t unit_idx;
    int16_t owner_idx;
    int16_t hero_slot;
    int16_t item_slot;

    *item_spell_save_adjust = 0;                   /* com1:0x8156A */
    if (caster_idx > COMBAT_CASTER_UNIT_MAX) {      /* JLE ->0x8157F at com1:0x81575 */
        *player_idx = caster_idx - COMBAT_CASTER_PLAYER_BIAS;
                                                    /* com1:0x81577..0x8157C */
        goto done;
    }

    *player_idx = _battle_units[caster_idx].controller_idx;
                                                    /* com1:0x8157F..0x81591 */
    unit_idx = _battle_units[caster_idx].unit_idx;  /* com1:0x81594..0x815A2 */
    owner_idx = (int8_t)_UNITS[unit_idx].owner_idx; /* com1:0x815A2..0x815A7 */
    hero_slot = (int8_t)_UNITS[unit_idx].Hero_Slot;
    if (hero_slot >= 0) {                           /* JLE ->0x81612 at com1:0x815AF */
        for (item_slot = 0; item_slot < HERO_ITEM_SLOTS; ++item_slot) {
                                                    /* JGE ->0x81612 at com1:0x815B6;
                                                       loop ->0x815B3 at com1:0x81610 */
            int16_t item_idx = _HEROES2[owner_idx]->heroes[hero_slot].Items[item_slot];
                                                    /* com1:0x815B8..0x815F1 */
            if (item_idx >= 0)                      /* JLE ->0x8160F at com1:0x815F6 */
                *item_spell_save_adjust -=
                    (int8_t)_ITEMS[item_idx * ITEM_RECORD_SIZE + ITEM_SPELL_SAVE_OFFSET];
                                                    /* com1:0x815F8..0x8160C */
        }
    }
done:
    *picked_target = -1;                            /* com1:0x81615..0x8161D */
}
#endif

/* AITP_Combat_Spell class dispatch is 131:0x80342..0x80366 160:= com1:=;
   class-16 table word is 131:0x81343 160:= com1:= and enters 0x80D3E. */
static int16_t A32_ai_shatter_candidate(int16_t spell_idx, int16_t battle_unit_idx,
                                        int16_t player_idx,
                                        int16_t item_spell_save_adjust)
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
    struct s_SPELL_DATA __far *spell = &_SPELL_DATA[spell_idx];
    int16_t effective_resist;
    int16_t target_value;

    if (A32_spell_class(spell_idx) != SPELL_CLASS_MUNDANE_CURSE)
        return ST_FALSE;
    if (bu->Attribs_1 & USA_IMMUNITY_MAGIC)         /* 131:0x80D50..0x80D56 160:= com1:= */
        return ST_FALSE;
    if (bu->Combat_Effects & A32_spell_effect_mask(spell_idx))
                                                    /* 131:0x80D5B..0x80D89 160:= com1:= */
        return ST_FALSE;

#if BUILD == MOM131
    if (spell->magic_realm == sbr_Sorcery && (bu->Attribs_1 & USA_IMMUNITY_ILLUSION))
        return ST_FALSE;                            /* 131:0x80D8E..0x80DBB 160:-- com1:-- */
#else
    if (spell->magic_realm == sbr_Death
        && (int8_t)_UNITS[bu->unit_idx].Hero_Slot >= 0)
        return ST_FALSE;                            /* 131:-- 160:0x80D8E..0x80DBB com1:= */
#endif

#if BUILD == MOM131 || BUILD == CP160
    if (((_UNITS[bu->unit_idx].enchantments | bu->enchantments | bu->item_enchantments)
         & UE_RIGHTEOUSNESS)
        && (spell->magic_realm == sbr_Chaos || spell->magic_realm == sbr_Death))
        return ST_FALSE;                            /* 131:0x80DBB..0x80E53 160:= com1:-- */
#else
    if (bu->Combat_Effects & COM1_SHATTER_CONFLICT_MASK)
        return ST_FALSE;                            /* 131:-- 160:-- com1:0x80DBB..0x80DD2 */
#endif

    if (bu->controller_idx == player_idx || bu->status != BUS_ACTIVE)
        return ST_FALSE;                            /* 131:0x80E53..0x80E84 160:= com1:0x80E32..0x80E87 */

#if BUILD == COM1
    if (spell_idx == SPELL_SHATTER) {                /* com1:0x80E87..0x80E8D ->0x80C74 */
        if ((uint8_t)bu->race >= RACE_FIRST_FANTASTIC)
            return ST_FALSE;                        /* com1:0x80C81..0x80C95 */
        if ((uint8_t)bu->melee <= COM1_SHATTER_ATTACK_FLOOR
            && (uint8_t)bu->ranged <= COM1_SHATTER_ATTACK_FLOOR)
            return ST_FALSE;                        /* com1:0x80C88..0x80C98 */
    }
#endif

    if ((uint8_t)bu->race >= RACE_FIRST_FANTASTIC)
        return ST_FALSE;                            /* 131:0x80E84..0x80E98 160:0x80E91..0x80E98 com1:= */

    if (!Target_Is_Visible(battle_unit_idx))
        return ST_FALSE;                            /* 131:0x80E98..0x80EA5 160:= com1:= */

    effective_resist = Combat_Effective_Resistance(*bu, spell->magic_realm);
                                                    /* 131:0x80EA5..0x80EDB 160:= com1:= */
#if BUILD == COM1
    effective_resist += Spell_Resistance_Modifier(spell_idx) + item_spell_save_adjust;
                                                    /* 131:-- 160:-- com1:0x80DD2..0x80DDE,0x80EDB */
    if (effective_resist >= COM1_SHATTER_RESIST_LIMIT)
        return ST_FALSE;                            /* com1:0x80EDE..0x80EE6 */
    target_value = (Effective_Battle_Unit_Strength(battle_unit_idx)
                    * (COM1_SHATTER_RESIST_LIMIT - effective_resist)
                    + COM1_SHATTER_RESIST_LIMIT - 1) / COM1_SHATTER_RESIST_LIMIT;
                                                    /* com1:0x80EE6..0x80F01 */
#else
    if (effective_resist >= MOM_SHATTER_RESIST_LIMIT)
        return ST_FALSE;                            /* 131:0x80EDB..0x80EE6 160:= */
    target_value = (Effective_Battle_Unit_Strength(battle_unit_idx)
                    * (MOM_SHATTER_RESIST_LIMIT - effective_resist)
                    + MOM_SHATTER_RESIST_LIMIT - 1) / MOM_SHATTER_RESIST_LIMIT;
                                                    /* 131:0x80EE6..0x80F01 160:= */
#endif
    (void)target_value;                             /* comparison/pick loop 131:0x80F01..0x80F1F 160:= com1:= */
    return ST_TRUE;
}

/* Combat_Spell_Target_Screen class dispatch is 131:0x85C29..0x85C4C 160:= com1:=;
   class-16 blocks are 131:0x85C55..0x85C5E, 160:0x85C50..0x85C70, com1:=. */
static int16_t A32_human_shatter_target(int16_t target_type, int16_t battle_unit_idx)
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];

    if (bu->controller_idx == 0)
        return ST_FALSE;                            /* 131:0x85F0F..0x85F19 160:= com1:= */
    if (target_type != COMBAT_TARGET_ENEMY_NORMAL)
        return ST_FALSE;
    return (uint8_t)bu->race < RACE_FIRST_FANTASTIC;
                                                    /* 131:0x85F31..0x85F50 160:= com1:= */
}

/* Cast_Spell_On_Battle_Unit class dispatch is 131:0x81F4C..0x81F6F 160:= com1:=;
   class-16 table word 131:0x82F91 160:= com1:= enters the shared type-13/16 island. */
static int16_t A32_apply_class_16_effect(int16_t spell_idx, int16_t battle_unit_idx,
                                         int16_t resistance_modifier, int16_t target_cgx,
                                         int16_t target_cgy, int16_t player_idx,
                                         int16_t anims_on, int16_t caster_idx)
{
    struct s_BATTLE_UNIT __far *target = &_battle_units[battle_unit_idx];

    Combat_Spell_Animation(target_cgx, target_cgy, spell_idx, player_idx, anims_on, caster_idx);
                                                    /* 131:0x82256..0x8226E 160:= com1:0x82256..0x82274 */
    if (Combat_Resistance_Check(*target, resistance_modifier,
                                _SPELL_DATA[spell_idx].magic_realm) <= 0)
        return ST_FALSE;                            /* 131:0x82256..0x822B2 160:= com1:= */
    target->Combat_Effects |= A32_spell_effect_mask(spell_idx);
                                                    /* 131:0x822B2..0x822E9 160:= com1:= */
    return ST_TRUE;
}
extern struct s_BATTLEFIELD __far *battlefield;
extern int8_t __far *combat_enchantments;
extern int16_t _combat_defender_player;
extern int16_t _combat_attacker_player;
extern int16_t _combat_total_unit_count; /* absolute word [0xC588] in all builds */
extern int16_t _defender_sees_illusions; /* absolute word [0xC41E] in all builds */
extern int16_t _attacker_sees_illusions; /* absolute word [0xC420] in all builds */
extern int16_t _combat_winner;           /* absolute word [0xC972] */
#if BUILD == COM1
extern struct s_NODE __far *_NODES;
extern int8_t OVL_Action_Plane;
extern int8_t OVL_Action_YPos;
extern int8_t OVL_Action_XPos;
#endif
#if BUILD == COM1
/* Near call sharing BU_ProcessAttack's frame. */
extern void com1_frame_helper_9AC1B(void);
extern void com1_frame_helper_9984B(void);
extern void com1_frame_helper_9985B(void);
extern void com1_apply_toblock_cap(void);
static struct s_BATTLE_UNIT __far *com1_load_battle_unit_address(int16_t index);
extern void __far overlay_03A0_003E(struct s_BATTLE_UNIT __far *bu);
extern void __far overlay_03A0_0052(struct s_BATTLE_UNIT __far *bu);
#endif

/* ===========================================================================
 * BU_UnitLoadToBattle -- overlay 98 thunk slot 102, [0x75C69, 0x75D93)
 * ReMoM orientation name BU_UnitLoadToBattle__SEGRAX, tag WZD o98p15.
 * ======================================================================== */

int16_t __far BU_UnitLoadToBattle(int16_t battle_unit_idx, int16_t player_idx,
                                  int16_t unit_idx, int16_t cgx, int16_t cgy)
{
    struct s_BATTLE_UNIT __far *bu;
#if BUILD == MOM131
    int16_t figure_slot;             /* [bp-2]; 131:0x75C6C  160:--  com1:-- */
    int16_t figure_load_result;
#else
    uint8_t slot_used[FIGURE_SLOT_MAP_BYTES];
                                        /* [bp-0x12]; 131:-- 160:0x75C6C com1:0x75C6C */
    int16_t slot;
    int16_t unit_type;
    int16_t result;
    int16_t figure_load_result;
#endif

    bu = &_battle_units[battle_unit_idx];
                                        /* 131:0x75C71..0x75C8A 160:= com1:= */
    Load_Battle_Unit(unit_idx, bu);      /* 131:0x75C8A 160:= com1:= */

#if BUILD == MOM131
    figure_slot = Battle_Unit_Pict_Open();
                                        /* 131:0x75C92 160:-- com1:-- */
    figure_load_result = Combat_Figure_Load((uint8_t)_UNITS[unit_idx].type,
                                             figure_slot);
                                        /* 131:0x75C9A..0x75CB5 160:-- com1:-- */
    /* The call result is preserved by push AX / pop AX around the address recomputation. */
    _battle_units[battle_unit_idx].bufpi = figure_load_result;
                                        /* 131:0x75CB7..0x75CC9 160:-- com1:-- */
    _battle_units[battle_unit_idx].controller_idx = (int8_t)player_idx;
                                        /* 131:0x75CCA..0x75CDD 160:-- com1:-- */
    _battle_units[battle_unit_idx].cgx = cgx;
                                        /* 131:0x75CDE..0x75CF1 160:-- com1:-- */
    _battle_units[battle_unit_idx].cgy = cgy;
                                        /* 131:0x75CF2..0x75D05 160:-- com1:-- */
    _battle_units[battle_unit_idx].target_cgx = cgx;
                                        /* 131:0x75D06..0x75D19 160:-- com1:-- */
    _battle_units[battle_unit_idx].target_cgy = cgy;
                                        /* 131:0x75D1A..0x75D2D 160:-- com1:-- */
    _battle_units[battle_unit_idx].move_anim_ctr = 0;
                                        /* 131:0x75D2E..0x75D40 160:-- com1:-- */
    _battle_units[battle_unit_idx].outline_magic_realm = 0;
                                        /* 131:0x75D41..0x75D53 160:-- com1:-- */
    _battle_units[battle_unit_idx].Atk_FigLoss = 0;
                                        /* 131:0x75D54..0x75D66 160:-- com1:-- */
    _battle_units[battle_unit_idx].Moving = 0;
                                        /* 131:0x75D67..0x75D79 160:-- com1:-- */
    _battle_units[battle_unit_idx].action = 0;
                                        /* 131:0x75D7A..0x75D8C 160:-- com1:-- */
    /* No battlefield-effects call. The last address product remains in AX. */
    return battle_unit_idx * BATTLE_UNIT_RECORD_SIZE;
                                        /* value from 131:0x75D7A; epilogue 0x75D8D..0x75D92 */
#else
    bu = &_battle_units[battle_unit_idx]; /* 131:-- 160:0x75C92 com1:0x75C92 */
    bu->controller_idx = (int8_t)player_idx;
                                        /* 131:-- 160:0x75C9E com1:0x75C9E */
    bu->cgx = cgx;                     /* 131:-- 160:0x75CA2..0x75CAA com1:= */
    bu->target_cgx = cgx;              /* 131:-- 160:0x75CAD com1:= */
    bu->cgy = cgy;                     /* 131:-- 160:0x75CAE..0x75CB4 com1:= */
    bu->target_cgy = cgy;              /* 131:-- 160:0x75CB7 com1:= */
    bu->move_anim_ctr = bu->Atk_FigLoss = bu->outline_magic_realm =
        bu->Moving = bu->action = 0;   /* 131:-- 160:0x75CB8..0x75CBE com1:= */

    for (slot = 0; slot < FIGURE_SLOT_MAP_BYTES; ++slot)
        slot_used[slot] = 0;           /* 131:-- 160:0x75CBF..0x75CCA com1:= */
    {
        int16_t i = 0;                 /* 131:-- 160:0x75CCB com1:= */
        struct s_BATTLE_UNIT __far *p = _battle_units;
                                        /* 131:-- 160:0x75CCD com1:= */
        /* This is bottom-tested: record zero is examined even when the count is nonpositive. */
        do {
            int16_t used = p->bufpi;   /* 131:-- 160:0x75CD1 com1:= */
            if (used >= 0 && (int8_t)p->status == BUS_ACTIVE)
                                        /* 131:-- 160:0x75CD5..0x75CDE com1:= */
                slot_used[used]++;     /* 131:-- 160:0x75CE0 com1:= */
            p = (struct s_BATTLE_UNIT __far *)
                ((uint8_t __far *)p + BATTLE_UNIT_RECORD_SIZE);
                                        /* 131:-- 160:0x75CE3 com1:= */
            ++i;                       /* 131:-- 160:0x75CE6 com1:= */
        } while (i < _combat_total_unit_count);
                                        /* 131:-- 160:0x75CE7..0x75CEC com1:= */

        slot = 0;                      /* 131:-- 160:0x75CED com1:= */
        while (slot_used[slot] != 0)   /* 131:-- 160:0x75CEF..0x75CF3 com1:= */
            ++slot;                   /* 131:-- 160:0x75CF5..0x75CF7 com1:= */
        /* Neither slot_used[used] nor this free-slot search has an upper-bound check. */
    }

    unit_type = (uint8_t)_UNITS[unit_idx].type;
                                        /* 131:-- 160:0x75CF8..0x75D0A com1:= */
    figure_load_result = Combat_Figure_Load(unit_type, slot);
                                        /* 131:-- 160:0x75D0C com1:= */
    bu->bufpi = figure_load_result;     /* 131:-- 160:0x75D13..0x75D1A com1:= */

#if BUILD == CP160
    result = unit_type;                /* 131:-- 160:0x75D1B ->0x75D84 com1:-- */
#endif

#if BUILD == COM1
    if (unit_type == UNIT_TYPE_DEMON) { /* 131:-- 160:-- com1:0x75D1B..0x75D1F */
        int16_t grant_word;

        if (battle_unit_idx >= COM1_DEMON_SLOT_FLOOR)
                                        /* 131:-- 160:-- com1:0x75D21..0x75D25 */
            grant_word = figure_load_result;
        else if (Random(COM1_DEMON_GRANT_DICE) == 1)
                                        /* 131:-- 160:-- com1:0x75D27..0x75D36 */
            grant_word = 0;            /* DEC AX leaves zero on the taken edge */
        else {
            result = -1;               /* 131:-- 160:-- com1:0x75D38 */
            goto battlefield_tail;     /* 131:-- 160:-- com1:0x75D3B */
        }

        bu->Spec_Att_Attrib = COM1_DEMON_SAVE_MODIFIER;
                                        /* 131:-- 160:-- com1:0x75D3D */
        *((uint8_t __far *)&bu->Attribs_1 + 1) = COM1_DEMON_ATTRIBS_1_HIGH;
                                        /* 131:-- 160:-- com1:0x75D42 */
        bu->attack_attributes |= ATT_LIFE_STEAL | ATT_DEATH_TOUCH;
                                        /* raw 0x0208; 131:-- 160:-- com1:0x75D47 */
        *(uint16_t __far *)&bu->mana_max = (uint16_t)grant_word;
                                        /* spans mana_max/mana; com1:0x75D4D */
    }

    if (unit_type == UNIT_TYPE_PALADINS)/* 131:-- 160:-- com1:0x75D51..0x75D54 */
        bu->race = RACE_LIFE;           /* 131:-- 160:-- com1:0x75D56 */
    if (unit_type == UNIT_TYPE_CENTAURS /* 131:-- 160:-- com1:0x75D5B..0x75D5E */
        || unit_type == UNIT_TYPE_CATAPULT)
                                        /* 131:-- 160:-- com1:0x75D60..0x75D63 */
        bu->race = RACE_NATURE;         /* 131:-- 160:-- com1:0x75D65 */

    result = 0;                         /* 131:-- 160:-- com1:0x75D6A */
    bu->Abilities |= UA_FANTASTIC;      /* 131:-- 160:-- com1:0x75D6C */
                                        /* nineteen NOPs com1:0x75D71..0x75D83 */
battlefield_tail:
#endif
    BU_Apply_Battlefield_Effects(bu);   /* 131:-- 160:0x75D84 com1:0x75D84 */
    return result;                      /* mov ax,si 160:0x75D8B com1:=;
                                           epilogue 160:0x75D8D..0x75D92 com1:= */
#endif
}

/* R6.2d shared resolution helpers. */

int16_t __far CMB_AttackRoll(int16_t attack_strength, int16_t to_hit)
{
    int16_t successes = 0;            /* 131:0x98F68  160:=  com1:= */
    int16_t roll_index = 0;           /* 131:0x98F6A  160:=  com1:= */

    while (roll_index < attack_strength) {
                                       /* initial jump 131:0x98F6C  160:=  com1:=;
                                          JL ->0x98F6E at 131:0x98F91  160:=  com1:= */
        int16_t die_roll = Random(D10_SIDES);
                                       /* call 00B0:00D8 at 131:0x98F72  160:=  com1:=;
                                          store at 131:0x98F78  160:=  com1:= */
        if (die_roll >= ROLL_TARGET_BASE - to_hit
                                       /* JLE ->0x98F8C, bytes 7E 06, at
                                          131:0x98F84  160:=  com1:= */
            || die_roll == D10_SIDES) /* JNE ->0x98F8D, bytes 75 01, at
                                          131:0x98F8A  160:=  com1:= */
            ++successes;             /* 131:0x98F8C  160:=  com1:= */
        ++roll_index;                /* 131:0x98F8D  160:=  com1:= */
    }
    return successes;                /* 131:0x98F93  160:=  com1:= */
}

int16_t __far CMB_DefenseRoll(int16_t defense, int16_t to_block)
{
    int16_t blocks = 0;               /* 131:0x98FA2  160:=  com1:= */
    int16_t die_index = 0;            /* 131:0x98FA4  160:=  com1:= */

    while (die_index < defense) {
                                       /* initial jump 131:0x98FA6  160:=  com1:=;
                                          JL ->0x98FA8 at 131:0x98FC1  160:=  com1:= */
        int16_t die_roll = Random(D10_SIDES);
                                       /* call 00B0:00D8 at 131:0x98FAC  160:=  com1:= */
        int16_t threshold = ROLL_TARGET_BASE; /* 131:0x98FB2  160:=  com1:= */
#if BUILD == COM1
        com1_apply_toblock_cap();     /* CALL ->0x9A8CA at com1:0x98FB5; shares this frame */
#else
        threshold -= to_block;        /* bytes 2B 56 08 at 131:0x98FB5  160:=  com1:â€” */
#endif
        if (die_roll >= threshold)    /* JL ->0x98FBD, bytes 7C 01, at
                                          131:0x98FBA  160:=  com1:= */
            ++blocks;                /* 131:0x98FBC  160:=  com1:= */
        ++die_index;                 /* 131:0x98FBD  160:=  com1:= */
    }
    return blocks;                   /* 131:0x98FC3  160:=  com1:= */
}

#if BUILD == COM1
/* Near callee sharing CMB_DefenseRoll's SI, DX, BP frame and arguments. */
void __near com1_apply_toblock_cap(void)
{
    if (die_index < COM1_TOBLOCK_DIE_LIMIT)
                                       /* CMP SI,0x0F; JGE ->0x9A8D2, bytes 7D 03,
                                          at com1:0x9A8CA..0x9A8CD */
        threshold -= to_block;        /* SUB DX,[BP+8] at com1:0x9A8CF */
    return;                            /* RET at com1:0x9A8D2 */
}
#endif

int16_t __far Combat_Resistance_Check(struct s_BATTLE_UNIT target,
                                      int16_t resistance_modifier,
                                      int16_t magic_realm)
{
    int16_t resistance = Combat_Effective_Resistance(target, magic_realm);
                                       /* by-value copy call 0000:0787 at 131:0x98FDB  160:=  com1:=;
                                          near CALL ->0x9900D at 131:0x98FE2  160:=  com1:= */
    resistance += resistance_modifier; /* 131:0x98FE8  160:=  com1:= */
    int16_t roll = Random(D10_SIDES);   /* call 00B0:00D8 at 131:0x98FF1  160:=  com1:= */
    if (roll > resistance)             /* JLE ->0x99005, bytes 7E 08, at
                                          131:0x98FFB  160:=  com1:= */
        return roll - resistance;      /* 131:0x98FFD..0x99001  160:=  com1:= */
    /* 131:0x99003  160:=  com1:= is unreachable EB 04 ->0x99009. */
    return 0;                          /* 131:0x99005  160:=  com1:= */
}

int16_t __far Combat_Effective_Resistance(struct s_BATTLE_UNIT target,
                                           int16_t magic_realm)
{
    uint32_t enchantments =
          _UNITS[target.unit_idx].enchantments
                                       /* 131:0x99015..0x99026  160:=  com1:= */
        | target.item_enchantments     /* 131:0x99030..0x99033  160:=  com1:= */
        | target.enchantments;         /* 131:0x9902A..0x99039  160:=  com1:= */
    int16_t resistance = (int8_t)target.resist;
                                       /* MOV/CBW at 131:0x9903C..0x99040  160:=  com1:= */
    int16_t unit_idx = target.unit_idx; /* 131:0x99042  160:=  com1:= */

    if ((int8_t)_UNITS[unit_idx].Hero_Slot > ST_UNDEFINED
                                       /* JLE ->0x990A9, bytes 7E 4D, at
                                          131:0x9905A  160:=  com1:= */
        && (_HEROES2[(int8_t)_UNITS[unit_idx].owner_idx]
                       ->heroes[(uint8_t)_UNITS[unit_idx].type].abilities & HSA_CHARMED)) {
                                       /* owner CBW at 131:0x9906D  160:=  com1:=;
                                          type zero-extension at 131:0x9908A  160:=  com1:=;
                                          JE ->0x990A9 at 131:0x990A4  160:=  com1:= */
        resistance += 30;             /* 131:0x990A6  160:=  com1:= */
    }

    if ((target.Attribs_1 & USA_IMMUNITY_MAGIC) && magic_realm >= sbr_Nature)
                                       /* JE ->0x990B9 at 131:0x990AE  160:=  com1:=;
                                          JL ->0x990B9 at 131:0x990B4  160:=  com1:= */
        resistance += 30;             /* 131:0x990B6  160:=  com1:= */

    if ((enchantments & UE_RIGHTEOUSNESS)
                                       /* JE ->0x990D8 at 131:0x990C7  160:=  com1:= */
        && (magic_realm == sbr_Chaos || magic_realm == sbr_Death))
                                       /* JE ->0x990D5 at 131:0x990CD  160:=  com1:=;
                                          JNE ->0x990D8 at 131:0x990D3  160:=  com1:= */
        resistance += 30;             /* 131:0x990D5  160:=  com1:= */

#if BUILD == COM1
    if (magic_realm == sbr_Nature) {
                                       /* Chaos arm nopped at com1:0x990DC;
                                          JNE ->0x9910E at com1:0x990E2 */
        (void)(enchantments & UE_ELEMENTAL_ARMOR);
                                       /* unconditional EB 05 ->0x990FA at com1:0x990F3;
                                          unreachable ADD DI,10 at com1:0x990F5 */
        if (enchantments & UE_RESIST_ELEMENTS)
                                       /* JE ->0x9910E at com1:0x99109 */
            resistance += 4;          /* com1:0x9910B */
    }
#else
    if (magic_realm == sbr_Chaos || magic_realm == sbr_Nature) {
                                       /* 131:0x990D8..0x990E2  160:=  com1:â€” */
        if (enchantments & UE_ELEMENTAL_ARMOR)
                                       /* JE ->0x990FA at 131:0x990F3  160:=  com1:â€” */
            resistance += 10;         /* 131:0x990F5  160:=  com1:â€” */
        else if (enchantments & UE_RESIST_ELEMENTS)
                                       /* JE ->0x9910E at 131:0x99109  160:=  com1:â€” */
            resistance += 3;          /* 131:0x9910B  160:=  com1:â€” */
    }
#endif

    if ((enchantments & UE_BLESS)
                                       /* JE ->0x9912D at 131:0x9911C  160:=  com1:= */
        && (magic_realm == sbr_Chaos || magic_realm == sbr_Death)) {
                                       /* JE ->0x9912A at 131:0x99122  160:=  com1:=;
                                          JNE ->0x9912D at 131:0x99128  160:=  com1:= */
#if BUILD == COM1
        resistance += 5;              /* com1:0x9912A */
#else
        resistance += 3;              /* 131:0x9912A  160:=  com1:â€” */
#endif
    }
    if ((enchantments & UE_RESIST_MAGIC) && magic_realm >= sbr_Nature)
                                       /* JE ->0x99146 at 131:0x9913B  160:=  com1:=;
                                          JL ->0x99146 at 131:0x99141  160:=  com1:= */
        resistance += 5;              /* 131:0x99143  160:=  com1:= */
    return resistance;                /* 131:0x99146  160:=  com1:= */
}

int16_t __far Battle_Unit_Attack_Immunities(int16_t battle_unit_idx,
                                             int16_t attack_mode)
{
    int16_t mask = 0;                 /* 131:0x99157  160:=  com1:= */
    int8_t ranged_type = (int8_t)_battle_units[battle_unit_idx].ranged_type;

    if (_battle_units[battle_unit_idx].attack_attributes & ATT_ILLUSIONARY)
                                       /* JLE ->0x99175 at 131:0x9916C  160:=  com1:= */
        mask |= USA_IMMUNITY_ILLUSION; /* 131:0x9916E  160:=  com1:= */

    if (attack_mode > am_Melee) {     /* JG ->0x9917E at 131:0x99179  160:=  com1:= */
        if (_battle_units[battle_unit_idx].ranged_attack_attributes & ATT_ILLUSIONARY)
                                       /* JLE ->0x9919A at 131:0x99191  160:=  com1:= */
            mask |= USA_IMMUNITY_ILLUSION; /* 131:0x99193  160:=  com1:= */
        if (RAT_CLASS(ranged_type) == RAT_CLASS_MISSILE)
                                       /* signed IDIV 10; JNE ->0x991BE at
                                          131:0x9919A..0x991B5  160:=  com1:= */
            mask |= USA_IMMUNITY_MISSILES; /* 131:0x991B7  160:=  com1:= */
        if (ranged_type == RAT_FIRE_BREATH)
                                       /* JNE ->0x991D9 at 131:0x991D0  160:=  com1:= */
            mask |= USA_IMMUNITY_FIRE; /* 131:0x991D2  160:=  com1:= */
        if (RAT_CLASS(ranged_type) == RAT_CLASS_MAGIC)
                                       /* signed IDIV 10; JNE ->0x991FD at
                                          131:0x991D9..0x991F4  160:=  com1:= */
            mask |= USA_IMMUNITY_MAGIC; /* 131:0x991F6  160:=  com1:= */

        if (RAT_CLASS(ranged_type) < RAT_CLASS_MAGIC
                                       /* JL ->0x99237 at 131:0x99218  160:=  com1:= */
#if BUILD == MOM131
            || RAT_CLASS(ranged_type) == RAT_THROWN)
                                       /* second signed IDIV 10; JNE ->0x99252 at
                                          131:0x99235  160:â€”  com1:â€” */
#else
            || ranged_type == RAT_THROWN)
                                       /* six NOPs replace IDIV at 160:0x9922C  com1:=;
                                          JNE ->0x99252 at 160:0x99235  com1:0x99235 */
#endif
        {
            if (_battle_units[battle_unit_idx].Weapon_Plus1 == 0)
                                       /* JNE ->0x99252 at 131:0x99249  160:=  com1:= */
                mask |= USA_IMMUNITY_WEAPON; /* 131:0x9924B  160:=  com1:= */
        }
    } else {
        if (_battle_units[battle_unit_idx].Weapon_Plus1 == 0)
                                       /* JNE ->0x9926F at 131:0x99266  160:=  com1:= */
            mask |= USA_IMMUNITY_WEAPON; /* 131:0x99268  160:=  com1:= */
        if (_battle_units[battle_unit_idx].melee_attack_attributes & ATT_ILLUSIONARY)
                                       /* JLE ->0x9928B at 131:0x99282  160:=  com1:= */
            mask |= USA_IMMUNITY_ILLUSION; /* 131:0x99284  160:=  com1:= */
    }
    return mask;                     /* 131:0x9928B  160:=  com1:= */
}

int16_t __far Battle_Unit_Attack_Magic_Realm(int16_t ranged_type_key,
                                              int16_t battle_unit_idx)
{
    int16_t magic_realm = sbr_NONE;   /* 131:0x9A7A9  160:=  com1:= */

    /* Borland's 21-entry value-table search is at 131:0x9A7B2..0x9A7C5 160:= com1:=:
       JE ->0x9A7C8 at 0x9A7BE (74 08), LOOP ->0x9A7B8 at 0x9A7C3 (E2 F3), then
       indirect JMP cs:[bx+0x2A] at 0x9A7C8. The value and target tables are
       0x9A857..0x9A8AA, outside this code extent. */
    switch (ranged_type_key) {
    case RAT_NONE:
        if ((int8_t)_battle_units[battle_unit_idx].race < RACE_FIRST_FANTASTIC)
                                       /* JGE ->0x9A7E5 at 131:0x9A7DE  160:=  com1:= */
            magic_realm = sbr_NONE;   /* 131:0x9A7E0  160:=  com1:= */
        else if ((int8_t)_battle_units[battle_unit_idx].race == RACE_FIRST_FANTASTIC)
                                       /* JNE ->0x9A7FE at 131:0x9A7F7  160:=  com1:= */
            magic_realm = sbr_Arcane; /* 131:0x9A7F9  160:=  com1:= */
        else
            magic_realm = (int8_t)_battle_units[battle_unit_idx].race - RACE_REALM_BIAS;
                                       /* 131:0x9A7FE..0x9A813  160:=  com1:= */
        break;
    case RAT_ROCK:
    case RAT_CANNON:
    case RAT_BOW:
    case RAT_SLING:
    case RAT_UNKNOWN:
    case RAT_THROWN:
        magic_realm = sbr_NONE;       /* stubs 131:0x9A817..0x9A822,0x9A839  160:=  com1:= */
        break;
    case RAT_LIGHTNING:
    case RAT_FIREBALL:
    case RAT_DEATH_BOLT:
    case RAT_DROW:
    case RAT_FIRE_BREATH:
    case RAT_LIGHTNING_BREATH:
    case RAT_MULTIPLE_GAZE:
        magic_realm = sbr_Chaos;      /* stubs/arm 131:0x9A824..0x9A826,0x9A82D,0x9A833,
                                         0x9A83B..0x9A83D,0x9A843  160:=  com1:= */
        break;
    case RAT_SORCERY:
        magic_realm = sbr_Sorcery;    /* 131:0x9A828  160:=  com1:= */
        break;
    case RAT_ICE_BOLT:
#if BUILD == COM1
        magic_realm = sbr_Sorcery;    /* EB F7 ->0x9A828, changed byte at com1:0x9A830 */
#else
        magic_realm = sbr_Nature;     /* EB 0E ->0x9A83F at 131:0x9A82F  160:=  com1:â€” */
#endif
        break;
    case RAT_PRIEST_SHAMAN:
    case RAT_SPRITE:
    case RAT_NATURE_BOLT:
    case RAT_STONING_GAZE:
        magic_realm = sbr_Nature;     /* stubs/arm 131:0x9A831,0x9A835..0x9A83F  160:=  com1:= */
        break;
    case RAT_DEATH_GAZE:
        magic_realm = sbr_Death;      /* 131:0x9A848  160:=  com1:= */
        break;
    }
    return magic_realm;               /* 131:0x9A84D  160:=  com1:= */
}

int16_t __far Range_To_Battle_Unit(int16_t first_idx, int16_t second_idx)
{
    int16_t dx = abs(_battle_units[first_idx].cgx - _battle_units[second_idx].cgx);
                                       /* call 0000:02C8 at 131:0x9B53F  160:=  com1:= */
    int16_t dy = abs(_battle_units[first_idx].cgy - _battle_units[second_idx].cgy);
                                       /* call 0000:02C8 at 131:0x9B56D  160:=  com1:= */
    if (dx > dy)                      /* JLE ->0x9B585 at 131:0x9B57C  160:=  com1:= */
        return dx;                    /* 131:0x9B57E  160:=  com1:= */
    /* 131:0x9B583 160:= com1:= is unreachable EB 05 ->0x9B58A. */
    return dy;                        /* 131:0x9B585  160:=  com1:= */
}

int16_t __far Battle_Unit_Has_Ranged_Attack(int16_t battle_unit_idx)
{
    int16_t result = ST_FALSE;        /* 131:0x9BB0A  160:=  com1:= */
    if ((int8_t)_battle_units[battle_unit_idx].ranged_type > RAT_NONE
                                       /* JLE ->0x9BB37 at 131:0x9BB1E  160:=  com1:= */
        && (int8_t)_battle_units[battle_unit_idx].ranged_type < RAT_THROWN) {
                                       /* JGE ->0x9BB37 at 131:0x9BB32  160:=  com1:= */
        result = ST_TRUE;             /* 131:0x9BB34  160:=  com1:= */
    }
    return result;                    /* 131:0x9BB37  160:=  com1:= */
}

int16_t __far BU_CauseFear(int16_t fear_source_idx, int16_t target_idx)
{
    int16_t failed_figures = 0;       /* 131:0x9BB4C  160:=  com1:= */
    struct s_BATTLE_UNIT __far *source = &_battle_units[fear_source_idx];
    struct s_BATTLE_UNIT __far *target = &_battle_units[target_idx];

    if (!((source->Attribs_2 & USA2_CAUSE_FEAR)
                                       /* JNE ->0x9BBD0 at 131:0x9BB63  160:=  com1:= */
          || (source->enchantments & UE_CLOAK_OF_FEAR)
                                       /* JNE ->0x9BBD0 at 131:0x9BB82  160:=  com1:= */
          || (source->item_enchantments & UE_CLOAK_OF_FEAR)
                                       /* JNE ->0x9BBD0 at 131:0x9BBA1  160:=  com1:= */
          || (_UNITS[source->unit_idx].enchantments & UE_CLOAK_OF_FEAR)))
                                       /* JE ->0x9BC35 at 131:0x9BBCE  160:=  com1:= */
        return failed_figures;
    if (target->Attribs_1 & USA_IMMUNITY_DEATH)
                                       /* JNE ->0x9BC35 at 131:0x9BBE3  160:=  com1:= */
        return failed_figures;

    int16_t figure = 0;               /* 131:0x9BBE5  160:=  com1:= */
    while (figure < (int8_t)target->Cur_Figures) {
                                       /* JG ->0x9BBEC at 131:0x9BC33  160:=  com1:= */
#if BUILD == COM1
        if (Combat_Resistance_Check(*target, -3, sbr_Death) > 0)
                                       /* PUSH -3 at com1:0x9BBF0; copy call com1:0x9BC08;
                                          resistance call com1:0x9BC0E; JLE ->0x9BC1B at 0x9BC16 */
#else
        if (Combat_Resistance_Check(*target, 0, sbr_Death) > 0)
                                       /* PUSH 0 at 131:0x9BBF0  160:=  com1:â€”;
                                          copy call 131:0x9BC08  160:=  com1:â€”;
                                          resistance call 131:0x9BC0E  160:=  com1:â€”;
                                          JLE ->0x9BC1B at 131:0x9BC16  160:=  com1:â€” */
#endif
            ++failed_figures;         /* 131:0x9BC18  160:=  com1:= */
        ++figure;                     /* 131:0x9BC1B  160:=  com1:= */
    }
    return failed_figures;            /* 131:0x9BC35  160:=  com1:= */
}

/* R6.2e defense-special and Wall of Fire helpers. */

int16_t __far Battle_Unit_Defense_Special(int16_t defender_battle_unit_idx,
                                          int16_t attack_ranged_type,
                                          int16_t attack_immunities,
                                          int16_t attack_flags,
                                          int16_t attack_magic_realm)
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[defender_battle_unit_idx];
                                      /* 131:0x9A58F  160:=  com1:= */
    int16_t defense_special = DEF_SPECIAL_NONE;
                                      /* write [bp-6]; 131:0x9A592  160:=  com1:= */
    uint32_t enchantments =
          _UNITS[bu->unit_idx].enchantments
                                      /* 131:0x9A597..0x9A5B9  160:=  com1:= */
        | bu->enchantments            /* half swap 131:0x9A5BA..0x9A5D2  160:=  com1:= */
        | bu->item_enchantments;      /* half swap 131:0x9A5D3..0x9A5EB  160:=  com1:=;
                                         stores [bp-2]/[bp-4] at 0x9A5EC/0x9A5EF */
    int16_t defense = (int8_t)bu->defense;
                                      /* 131:0x9A5F2..0x9A605  160:=  com1:= */

#if BUILD == COM1
    /* Pointer reloads at 0x9A606, 0x9A634, 0x9A652 and 0x9A670 are replaced by
     * NOPs; ES:BX still addresses this battle unit. */
#endif

    if (attack_immunities & bu->Attribs_1 & USA_IMMUNITY_ILLUSION) {
                                      /* JE ->0x9A628; 131:0x9A613..0x9A61D  160:=  com1:= */
        attack_immunities ^= USA_IMMUNITY_ILLUSION;
                                      /* write [bp+0x0A]; 131:0x9A61F..0x9A625  160:=  com1:= */
    }
    if (attack_immunities & USA_IMMUNITY_ILLUSION)
                                      /* JE ->0x9A634; 131:0x9A628..0x9A62D  160:=  com1:= */
        return 0;                     /* 131:0x9A62F..0x9A633  160:=  com1:= */

    if ((bu->Abilities & UA_LARGE_SHIELD) > 0
                                      /* JLE ->0x9A652; 131:0x9A634..0x9A647  160:=  com1:= */
        && attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A652; 131:0x9A649..0x9A64D  160:=  com1:= */
#if BUILD == COM1
        defense += COM1_LARGE_SHIELD_DEFENSE; /* com1:0x9A64F */
#else
        defense += MOM_LARGE_SHIELD_DEFENSE;  /* 131:0x9A64F  160:=  com1:— */
#endif
    }

#if BUILD == MOM131
    if ((bu->Attribs_1 & attack_immunities) != 0
                                      /* JE ->0x9A673; 131:0x9A652..0x9A666 */
        && attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A673; 131:0x9A668..0x9A66C */
        defense_special = DEF_SPECIAL_FULL; /* write 131:0x9A66E */
    }
    if (attack_immunities & bu->Attribs_1 & USA_IMMUNITY_WEAPON) {
                                      /* JE ->0x9A691; 131:0x9A673..0x9A68A */
        defense_special = DEF_SPECIAL_WEAPON_IMMUNITY; /* write 131:0x9A68C */
    }
#else
    if (attack_immunities & bu->Attribs_1 & USA_IMMUNITY_WEAPON) {
                                      /* JE ->0x9A670; 160:0x9A65F..0x9A669  com1:= */
        defense_special = DEF_SPECIAL_WEAPON_IMMUNITY;
                                      /* write 160:0x9A66B  com1:= */
    }
    if (((uint8_t)bu->Attribs_1 & (uint8_t)attack_immunities) != 0
                                      /* byte TEST; JE ->0x9A691;
                                         160:0x9A67D..0x9A684  com1:= */
        && attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A691; 160:0x9A686..0x9A68A  com1:= */
        defense_special = DEF_SPECIAL_FULL; /* write 160:0x9A68C  com1:= */
    }
#endif

    if ((bu->Attribs_1 & USA_IMMUNITY_MAGIC)
                                      /* JE ->0x9A6B7; 131:0x9A691..0x9A6A4
                                         160:=  com1:0x9A691..0x9A697 */
        && attack_magic_realm > sbr_NONE
                                      /* JLE ->0x9A6B7; 131:0x9A6A6..0x9A6AA
                                         160:=  com1:0x9A699..0x9A69D */
        && attack_ranged_type != RAT_NONE
                                      /* JE ->0x9A6B7; 131:0x9A6AC..0x9A6B0
                                         160:=  com1:0x9A69F..0x9A6A3 */
#if BUILD == COM1
        && attack_ranged_type != RAT_LIGHTNING_BREATH
                                      /* JE ->0x9A6B7; com1:0x9A6A5..0x9A6A9 */
        && attack_ranged_type != RAT_FIRE_BREATH
                                      /* JE ->0x9A6B7; com1:0x9A6AB..0x9A6AF */
#endif
        )
        defense_special = DEF_SPECIAL_FULL; /* write 131:0x9A6B2  160:=  com1:= */

    if (attack_magic_realm == sbr_Chaos || attack_magic_realm == sbr_Death) {
                                      /* JE ->0x9A6C3 / JNE ->0x9A72D;
                                         131:0x9A6B7..0x9A6C1  160:=  com1:= */
        if (enchantments & UE_BLESS) {
                                      /* JE ->0x9A6D6 or 0x9A6DC;
                                         131:0x9A6C3..0x9A6D1  160:=  com1:= */
#if BUILD == COM1
            if (attack_ranged_type > RAT_MAGIC_LAST_EXCL - 1)
                                      /* JLE ->0x9A6DC; com1:0x9A6D3..0x9A6D7 */
                defense += COM1_BLESS_DEFENSE; /* com1:0x9A6D9 */
#else
            defense += MOM_BLESS_DEFENSE;      /* 131:0x9A6D3  160:= */
#endif
        }

#if BUILD == MOM131
        if ((_UNITS[bu->unit_idx].enchantments & UE_RIGHTEOUSNESS)
                                      /* JNE ->0x9A722; 131:0x9A6D6..0x9A701 */
            || (bu->enchantments & UE_RIGHTEOUSNESS)) {
                                      /* JE ->0x9A72D; 131:0x9A703..0x9A720 */
            if (attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A72D; 131:0x9A722..0x9A726 */
                defense_special = DEF_SPECIAL_FULL; /* write 131:0x9A728 */
            }
        }
#elif BUILD == CP160
        if (enchantments & UE_RIGHTEOUSNESS) {
                                      /* JE ->0x9A72D / JMP ->0x9A722;
                                         160:0x9A6D6..0x9A6DE */
            if (attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A72D; 160:0x9A722..0x9A726 */
                defense_special = DEF_SPECIAL_FULL; /* write 160:0x9A728 */
            }
        }
        /* 160:0x9A6E0..0x9A721 is an unreachable orphan of the 1.31 block. */
#else
        /* com1:0x9A6DC..0x9A732 is an 87-byte NOP field: Righteousness removed. */
#endif
    }

#if BUILD == COM1
    if (attack_ranged_type != RAT_THROWN
                                      /* JE ->0x9A769; com1:0x9A733..0x9A737 */
        && attack_ranged_type >= RAT_MAGIC_FIRST) {
                                      /* JL ->0x9A769; com1:0x9A739..0x9A73D */
        if (enchantments & UE_ELEMENTAL_ARMOR) {
                                      /* JE ->0x9A755; com1:0x9A73F..0x9A74E */
            defense += COM1_ELEMENTAL_ARMOR_DEFENSE; /* com1:0x9A750 */
        }
        if (enchantments & UE_RESIST_ELEMENTS) {
                                      /* JE ->0x9A769; com1:0x9A755..0x9A764 */
            defense += COM1_RESIST_ELEMENTS_DEFENSE; /* com1:0x9A766 */
        }
    }
#else
    if ((attack_magic_realm == sbr_Chaos || attack_magic_realm == sbr_Nature)
                                      /* JE ->0x9A739 / JNE ->0x9A769;
                                         131:0x9A72D..0x9A737  160:= */
        && attack_ranged_type != RAT_NONE) {
                                      /* JE ->0x9A769; 131:0x9A739..0x9A73D  160:= */
        if (enchantments & UE_ELEMENTAL_ARMOR) {
                                      /* JE ->0x9A755; 131:0x9A73F..0x9A74E  160:= */
            defense += MOM_ELEMENTAL_ARMOR_DEFENSE; /* 131:0x9A750  160:= */
        } else if (enchantments & UE_RESIST_ELEMENTS) {
                                      /* JMP ->0x9A769 at 0x9A753; JE ->0x9A769
                                         at 131:0x9A764  160:= */
            defense += MOM_RESIST_ELEMENTS_DEFENSE; /* 131:0x9A766  160:= */
        }
    }
#endif

    if (attack_flags & ATT_ARMOR_PIERCING) {
                                      /* JE ->0x9A779; 131:0x9A769..0x9A76E  160:=  com1:= */
        defense = defense / 2;        /* signed truncation toward zero;
                                         131:0x9A770..0x9A778  160:=  com1:= */
    }

    if (defense_special == DEF_SPECIAL_WEAPON_IMMUNITY) {
                                      /* JNE ->0x9A787; 131:0x9A779..0x9A77D  160:=  com1:= */
#if BUILD == COM1
        defense += COM1_WEAPON_IMMUNITY_BONUS;
                                      /* JMP ->0x9A787; com1:0x9A77F..0x9A783 */
#else
        if (defense < MOM_WEAPON_IMMUNITY_FLOOR)
                                      /* JGE ->0x9A787; 131:0x9A77F..0x9A782  160:= */
            defense = MOM_WEAPON_IMMUNITY_FLOOR; /* 131:0x9A784  160:= */
#endif
    }

    if (defense_special == DEF_SPECIAL_FULL) {
                                      /* JNE ->0x9A793; 131:0x9A787..0x9A78B  160:=  com1:= */
#if BUILD == COM1
        return COM1_DEFENSE_SPECIAL_VALUE; /* com1:0x9A78D */
#else
        return MOM_DEFENSE_SPECIAL_VALUE;  /* 131:0x9A78D  160:= */
#endif
    }
    return defense;                  /* 131:0x9A793..0x9A79D  160:=  com1:= */
}

#if BUILD == COM1
/* Out-of-line near helper at com1:0x9EDD2..0x9EE20. Its sole caller is
 * 0x9E96F: E8 60 04; Check_Wall_Of_Fire_Attack jumps over this island. */
static void __near com1_apply_guardian_node_heavenly_light(void)
{
    int16_t node_idx = 0;            /* com1:0x9EDD2 */
    while (node_idx < NUM_NODES) {
                                      /* JL ->0x9EDD4; com1:0x9EE1A..0x9EE1E */
        struct s_NODE __far *node = &_NODES[node_idx];
                                      /* stride 0x30; com1:0x9EDD4..0x9EDE0 */
        if ((node->flags & NF_GUARDIAN)
                                      /* JE ->0x9EE1A; com1:0x9EDE1..0x9EDE6 */
            && node->owner_idx == (int8_t)_combat_defender_player
                                      /* JNE ->0x9EE1A; com1:0x9EDE8..0x9EDF0 */
            && node->wx == OVL_Action_XPos
                                      /* JNE ->0x9EE1A; com1:0x9EDF2..0x9EDF9 */
            && node->wy == OVL_Action_YPos
                                      /* JNE ->0x9EE1A; com1:0x9EDFB..0x9EE03 */
            && node->wp == OVL_Action_Plane) {
                                      /* JNE ->0x9EE1A; com1:0x9EE05..0x9EE0D */
            battlefield->city_enchantments[CITY_ENCHANT_HEAVENLY_LIGHT] =
                node->owner_idx + 1; /* sole non-frame write, raw +0x1593;
                                         com1:0x9EE0F..0x9EE19 */
        }
        ++node_idx;                  /* com1:0x9EE1A */
    }
    return;                          /* near RET com1:0x9EE20 */
}
#endif

int16_t __far Battle_Unit_In_City_Wall_Box(int16_t battle_unit_idx)
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
                                      /* 131:0x9EFE6..0x9EFF5  160:=  com1:= */
    if (bu->cgx < CITY_WALL_BOX_CGX_FIRST)
                                      /* JL ->0x9F040; 131:0x9EFF6..0x9EFFB  160:=  com1:= */
        return 0;
    if (bu->cgy < CITY_WALL_BOX_CGY_FIRST)
                                      /* JL ->0x9F040; 131:0x9EFFD..0x9F00F  160:=  com1:= */
        return 0;
    if (bu->cgx > CITY_WALL_BOX_CGX_LAST)
                                      /* JG ->0x9F040; 131:0x9F011..0x9F023  160:=  com1:= */
        return 0;
    if (bu->cgy > CITY_WALL_BOX_CGY_LAST)
                                      /* JG ->0x9F040; 131:0x9F025..0x9F037  160:=  com1:= */
        return 0;
    return 1;                         /* jump remnants 0x9F03E/0x9F042;
                                         131:0x9F039..0x9F045  160:=  com1:= */
}

void __far Check_Wall_Of_Fire_Attack(int16_t battle_unit_idx)
{
    int16_t damage_types[NUM_DAMAGE_TYPES]; /* deliberately uninitialized; [bp-6] */
    struct s_BATTLE_UNIT __far *bu;

    if (battlefield->wall_of_fire <= 0)
                                      /* JG ->0x9EDC3; 131:0x9EDB1..0x9EDBE  160:=  com1:= */
        return;                       /* JMP ->0x9EE80; 131:0x9EDC0  160:=  com1:= */
    bu = &_battle_units[battle_unit_idx];
                                      /* 131:0x9EDC3..0x9EDCF  160:=  com1:= */

#if BUILD == COM1
    /* com1:0x9EDD0 jumps over the helper and 0x9EE21..0x9EE28 NOP padding. */
    if ((int8_t)bu->controller_idx == (int8_t)_combat_defender_player)
                                      /* JE ->0x9EDC0; com1:0x9EE29..0x9EE31 */
        return;
    if (bu->Move_Flags & (MV_FLYING | MV_TELEPORT | MV_MERGING))
                                      /* byte TEST raw 0x98; JNE ->0x9EE80;
                                         com1:0x9EE33..0x9EE38 */
        return;
#else
    if (bu->Move_Flags & MV_FLYING)
                                      /* JE ->0x9EDDA; 131:0x9EDD0..0x9EDD5  160:= */
        return;                       /* JMP ->0x9EE80; 131:0x9EDD7  160:= */
    if (bu->Move_Flags & MV_TELEPORT)
                                      /* JE ->0x9EDF1; 131:0x9EDDA..0x9EDEC  160:= */
        return;                       /* JMP ->0x9EE80; 131:0x9EDEE  160:= */
    if (bu->Move_Flags & MV_MERGING)
                                      /* JNE ->0x9EE80; 131:0x9EDF1..0x9EE03  160:= */
        return;
    if (Battle_Unit_In_City_Wall_Box(battle_unit_idx) != 0)
                                      /* CALL ->0x9EFE3 at 0x9EE08; JNE ->0x9EE80
                                         at 131:0x9EE0E  160:= */
        return;
#endif

    if (bu->target_cgx < CITY_WALL_BOX_CGX_FIRST)
                                      /* JL ->0x9EE80; 131:0x9EE10..0x9EE22
                                         160:=  com1:0x9EE3A..0x9EE3F */
        return;
    if (bu->target_cgx > CITY_WALL_BOX_CGX_LAST)
                                      /* JG ->0x9EE80; 131:0x9EE24..0x9EE36
                                         160:=  com1:0x9EE41..0x9EE46 */
        return;
    if (bu->target_cgy < CITY_WALL_BOX_CGY_FIRST)
                                      /* JL ->0x9EE80; 131:0x9EE38..0x9EE4A
                                         160:=  com1:0x9EE48..0x9EE4D */
        return;
    if (bu->target_cgy > CITY_WALL_BOX_CGY_LAST)
                                      /* JG ->0x9EE80; 131:0x9EE4C..0x9EE5E
                                         160:=  com1:0x9EE4F..0x9EE54 */
        return;

#if BUILD == COM1
    if (Battle_Unit_In_City_Wall_Box(battle_unit_idx) != 0)
                                      /* CALL ->0x9EFE3 at 0x9EE58; JNE ->0x9EE80
                                         at com1:0x9EE5E */
        return;
#endif

    overlay_0388_0039(SPELL_FIREBALL, battle_unit_idx, damage_types,
#if BUILD == COM1
                      COM1_WALL_OF_FIRE_STRENGTH);
                                      /* push 10 com1:0x9EE60; CALL 0388:0039 at 0x9EE6C */
#else
                      MOM_WALL_OF_FIRE_STRENGTH);
                                      /* push 0 131:0x9EE60; CALL 0388:0039 at 0x9EE6C  160:= */
#endif
    overlay_0388_003E(battle_unit_idx, damage_types);
                                      /* CALL 0388:003E; 131:0x9EE79  160:=  com1:= */
}

/* R6.2f spell damage and application closure. */

void __far Apply_Battle_Unit_Damage_From_Spell(int16_t spell_idx,
                                                int16_t battle_unit_idx,
                                                int16_t damage_types[NUM_DAMAGE_TYPES],
                                                int16_t attack_strength_override)
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
    struct s_SPELL_DATA __far *spell = &_SPELL_DATA[spell_idx];
    uint32_t enchantments =
          _UNITS[bu->unit_idx].enchantments
        | bu->enchantments
        | bu->item_enchantments;
                                      /* 131:0x87048..0x870A0  160:=  com1:= */
    int16_t figures_killed = 0;       /* 131:0x87041  160:=  com1:= */
    int16_t damage_carry = 0;         /* 131:0x87046  160:=  com1:= */
    int16_t total_damage = 0;         /* 131:0x870A3  160:=  com1:= */
    int16_t i;

    for (i = 0; i < NUM_DAMAGE_TYPES; ++i)
                                      /* JL ->0x870AF at 131:0x870C4  160:=  com1:= */
        damage_types[i] = 0;          /* 131:0x870B9  160:=  com1:= */

    if ((enchantments & UE_RIGHTEOUSNESS)
                                      /* JE ->0x87100 at 131:0x870D4  160:=  com1:= */
        && (spell->magic_realm == sbr_Chaos || spell->magic_realm == sbr_Death))
                                      /* JE ->0x87115 at 131:0x870E9/0x870FE  160:=  com1:= */
        return;
    if (bu->Attribs_1 & USA_IMMUNITY_MAGIC)
                                      /* JE ->0x8711A at 131:0x87113  160:=  com1:= */
        return;

    int16_t figure_damage = (int8_t)bu->front_figure_damage;
                                      /* 131:0x8711A..0x8712C  160:=  com1:= */
    int16_t attack_flags = spell->Params2_3;
                                      /* 131:0x8712F..0x87141  160:=  com1:= */
    int16_t to_block = (int8_t)bu->toblock;
                                      /* 131:0x87144..0x87156  160:=  com1:= */
    if (attack_flags & ATT_ELDRITCH_WEAPON)
                                      /* JE ->0x87163 at 131:0x8715E  160:=  com1:= */
        --to_block;

    int16_t attack_immunities = (uint8_t)spell->Param1;
                                      /* 131:0x87163..0x87177  160:=  com1:= */
    int16_t attack_strength;
    if (attack_strength_override > 0)
                                      /* JLE ->0x87185 at 131:0x8717E  160:=  com1:= */
        attack_strength = attack_strength_override;
    else
        attack_strength = (uint8_t)spell->Param0;
                                      /* 131:0x87185..0x87199  160:=  com1:= */

    int16_t defense = Battle_Unit_Defense_Special(
        battle_unit_idx,
#if BUILD == COM1
        SPELL_DAMAGE_RANGED_TYPE_COM1,
                                      /* MOV AX,0x27; com1:0x871B6 */
#else
        SPELL_DAMAGE_RANGED_TYPE_MOM,
                                      /* MOV AX,0x26; 131:0x871B6  160:= */
#endif
        attack_immunities, attack_flags, (int8_t)spell->magic_realm);
                                      /* lcall 03D0:0043 at 131:0x871BB  160:=  com1:= */

    int16_t attack_count;
    if (attack_flags & ATT_AREA) {
                                      /* JE ->0x871ED at 131:0x871CB  160:=  com1:= */
        attack_count = (int8_t)bu->Cur_Figures;
        attack_flags |= ATT_DAMAGE_LIMIT;
                                      /* OR raw 0x2000 at 131:0x871E2  160:=  com1:= */
    } else if (attack_flags & ATT_WARP_LIGHTNING) {
                                      /* JE ->0x871FC at 131:0x871F2  160:=  com1:= */
        attack_count = attack_strength;
    } else {
        attack_count = 1;
    }

    if (bu->Combat_Effects & BUE_BLACK_SLEEP)
                                      /* JE ->0x8721F at 131:0x87214  160:=  com1:= */
        attack_flags |= ATT_AUTOMATIC_DAMAGE;
                                      /* OR raw 0x10 at 131:0x87216  160:=  com1:= */

    for (i = 0; i < attack_count; ++i) {
                                      /* JGE ->0x87356 at 131:0x87351  160:=  com1:= */
        if (attack_flags & ATT_AUTOMATIC_DAMAGE) {
                                      /* JE ->0x87233 at 131:0x8722C  160:=  com1:= */
            damage_carry = attack_strength;
        } else {
            damage_carry += CMB_AttackRoll(attack_strength, 0);
                                      /* lcall 03D0:0020 at 131:0x87239  160:=  com1:= */
            damage_carry -= CMB_DefenseRoll(defense, to_block);
                                      /* lcall 03D0:0025 at 131:0x87248  160:=  com1:= */
            if (enchantments & UE_INVULNERABILITY)
                                      /* JE ->0x87264 at 131:0x8725F  160:=  com1:= */
                damage_carry -= INVULNERABILITY_DAMAGE_REDUCTION;
            if (damage_carry < 0)
                damage_carry = 0;
        }

        if (i == 0 && figure_damage >= 0) {
                                      /* 131:0x8726A..0x87274  160:=  com1:= */
            damage_carry += figure_damage;
            figure_damage = 0;
        }
        if (figure_damage < 0) {
                                      /* JGE ->0x87299 at 131:0x87282  160:=  com1:= */
            figure_damage += damage_carry;
            if (figure_damage > 0) {
                                      /* JLE ->0x87297 at 131:0x8728B  160:=  com1:= */
                damage_carry = figure_damage;
                figure_damage = 0;
            } else {
                damage_carry = 0;
            }
        }

        if (attack_flags & ATT_DAMAGE_LIMIT) {
                                      /* JE ->0x872BD at 131:0x8729E  160:=  com1:= */
            if ((int8_t)bu->hits < damage_carry) {
                                      /* JGE ->0x872BB at 131:0x872B4  160:=  com1:= */
                ++figures_killed;
                damage_carry = 0;
            }
        } else {
            while ((int8_t)bu->hits < damage_carry) {
                                      /* JL ->0x872BF at 131:0x87313  160:=  com1:= */
                ++figures_killed;
                damage_carry -= (int8_t)bu->hits;
                if (!(attack_flags & ATT_AUTOMATIC_DAMAGE)) {
                                      /* JNE ->0x872FF at 131:0x872DB  160:=  com1:= */
                    damage_carry -= CMB_DefenseRoll(defense, to_block);
                                      /* lcall 03D0:0025 at 131:0x872E3  160:=  com1:= */
                    if (enchantments & UE_INVULNERABILITY)
                                      /* JE ->0x872FF at 131:0x872FA  160:=  com1:= */
                        damage_carry -= INVULNERABILITY_DAMAGE_REDUCTION;
                }
            }
            if (damage_carry < 0)
                damage_carry = 0;
        }

        total_damage += damage_carry + (int8_t)bu->hits * figures_killed;
                                      /* signed IMUL low word; 131:0x8731B..0x87334  160:=  com1:= */
        damage_carry = 0;
        figures_killed = 0;
        if (attack_flags & ATT_WARP_LIGHTNING)
                                      /* JE ->0x87348 at 131:0x87343  160:=  com1:= */
            --attack_strength;
    }

    total_damage -= (int8_t)bu->front_figure_damage;
                                      /* 131:0x87356..0x8736D  160:=  com1:= */
    if (total_damage < 0)
        total_damage = 0;
    damage_types[DMG_REGULAR] = total_damage;
                                      /* 131:0x8737B..0x87381  160:=  com1:= */
}

void __far BU_ApplyDamage(int16_t battle_unit_idx,
                          int16_t damage_types[NUM_DAMAGE_TYPES])
{
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
    int16_t total = 0;
    int16_t i;
    for (i = 0; i < NUM_DAMAGE_TYPES; ++i)
                                      /* JL ->0x8739D at 131:0x873AF  160:=  com1:= */
        total += damage_types[i];

    if (total <= 0)
        return;                       /* JMP ->0x876BA at 131:0x873B7  160:=  com1:= */
    if ((int8_t)bu->status != BUS_ACTIVE)
        return;                       /* JMP ->0x876BA at 131:0x873CE  160:=  com1:= */

    for (i = 0; i < NUM_DAMAGE_TYPES; ++i) {
                                      /* JL ->0x873D5 at 131:0x87447  160:=  com1:= */
        if ((uint8_t)bu->damage[i] + damage_types[i] > BU_DAMAGE_CEILING)
                                      /* JLE ->0x87410 at 131:0x873F8  160:=  com1:= */
            bu->damage[i] = BU_DAMAGE_CEILING;
                                      /* 26 C6 47 36 C8 at 131:0x87409  160:=  com1:= */
        else
            bu->damage[i] += (uint8_t)damage_types[i];
                                      /* state write at 131:0x8743F  160:=  com1:= */
    }

    total += (int8_t)bu->front_figure_damage;
    if (total > 0) {
                                      /* false jump ->0x87504 at 131:0x87464  160:=  com1:= */
        int16_t figures_lost = total / (int8_t)bu->hits;
                                      /* CWD / IDIV at 131:0x8747E  160:=  com1:= */
        if ((int8_t)bu->Cur_Figures < figures_lost)
            figures_lost = (int8_t)bu->Cur_Figures;
        bu->Cur_Figures -= (int8_t)figures_lost;
                                      /* 131:0x874D3  160:=  com1:= */
        bu->front_figure_damage = (int8_t)(total % (int8_t)bu->hits);
                                      /* second CWD / IDIV; state write 131:0x87500  160:=  com1:= */
    }

    if ((int8_t)bu->Cur_Figures > 0)
        return;                       /* JMP ->0x876BA at 131:0x87518  160:=  com1:= */

#if BUILD == CP160 || BUILD == COM1
    /* Eight NOP bytes at 160:0x8751B..0x87522 and com1:0x8751B..0x87522. */
    bu->status = BUS_DEAD;            /* 26 C6 47 34 04; 160:0x87523  com1:0x87523 */
#endif
    bu->Cur_Figures = 0;              /* 131:0x87528  160:=  com1:= */
    _combat_winner = Eliminated_Opponent();
                                      /* call 0x88470 and DS:0xC972 store at 131:0x8752E..0x87532
                                         160:=  com1:= */

#if BUILD == MOM131 || BUILD == CP160
    if (Battle_Unit_Is_Summoned_Creature(battle_unit_idx) != ST_FALSE)
                                      /* lcall 03E0:005C; JE ->0x87560 at 131:0x87536..0x8753E
                                         160:= */
        _UNITS[bu->unit_idx].wp = UNIT_WP_GONE;
                                      /* 26 C6 47 02 09 at 131:0x8755B  160:= */
#else
    (void)Battle_Unit_Is_Summoned_Creature(battle_unit_idx);
                                      /* result discarded; com1:0x87536 */
    Calc_Battlefield_Bonuses(_combat_structure);
                                      /* FF 36 20 C5 / 9A 4D 00 D0 03;
                                         com1:0x8753C..0x87545 */
    /* Twenty-six NOP bytes at com1:0x87546..0x8755F. */
#endif

    if ((uint8_t)bu->damage[DMG_IRREVERSIBLE] >= (uint8_t)bu->damage[DMG_UNDEATH]
                                      /* JB ->0x875C1 at 131:0x87584  160:=  com1:= */
        && (uint8_t)bu->damage[DMG_IRREVERSIBLE] >= (uint8_t)bu->damage[DMG_REGULAR]) {
                                      /* JB ->0x875C1 at 131:0x875AA  160:=  com1:= */
        bu->status = BUS_GONE;        /* 131:0x875B9  160:=  com1:= */
    } else if ((uint8_t)bu->damage[DMG_UNDEATH] > (uint8_t)bu->damage[DMG_IRREVERSIBLE]
                                      /* JBE ->0x87657 at 131:0x875E5  160:=  com1:= */
               && (uint8_t)bu->damage[DMG_UNDEATH] >= (uint8_t)bu->damage[DMG_REGULAR]) {
                                      /* JB ->0x87657 at 131:0x8760B  160:=  com1:= */
        if (_UNITS[bu->unit_idx].wp == UNIT_WP_GONE)
            bu->status = BUS_GONE;    /* 131:0x8763C  160:=  com1:= */
        else
            bu->status = BUS_DRAINED; /* 131:0x87650  160:=  com1:= */
    } else if ((uint8_t)bu->damage[DMG_REGULAR] > (uint8_t)bu->damage[DMG_IRREVERSIBLE]
                                      /* JBE ->0x876B5 at 131:0x8767B  160:=  com1:= */
               && (uint8_t)bu->damage[DMG_REGULAR] > (uint8_t)bu->damage[DMG_UNDEATH]) {
                                      /* JBE ->0x876B5 at 131:0x876A1  160:=  com1:= */
        bu->status = BUS_DEAD;        /* 131:0x876B0  160:=  com1:= */
    }

    Update_Sees_Illusions();         /* 9A 3E 00 48 03; 131:0x876B5  160:=  com1:= */
}

/* Exported target 0348:003E, reconstructed by R6.5a. */
void __far Update_Sees_Illusions(void)
{
    int16_t battle_unit_idx;

    _attacker_sees_illusions = ST_FALSE;
                                      /* 131:0x7BDA3  160:=  com1:= */
    _defender_sees_illusions = ST_FALSE;
                                      /* 131:0x7BDA9  160:=  com1:= */

    battle_unit_idx = 0;              /* 131:0x7BDAF  160:=  com1:= */
    while (battle_unit_idx < _combat_total_unit_count) {
                                      /* initial JMP ->0x7BE30 at 131:0x7BDB1  160:=  com1:=;
                                         JGE ->0x7BE39 (epilogue) at 131:0x7BE34  160:=  com1:= */
        struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
                                      /* signed index * raw record size 0x006E;
                                         131:0x7BDB3  160:=  com1:= */

        if ((int8_t)bu->status == BUS_ACTIVE) {
                                      /* JNE ->0x7BE2F (loop increment) at
                                         131:0x7BDC0  160:=  com1:= */
            if ((int8_t)bu->controller_idx == _combat_attacker_player) {
                                      /* JNE ->0x7BDFC (defender test) at
                                         131:0x7BDD4  160:=  com1:= */
                if (bu->Attribs_1 & USA_IMMUNITY_ILLUSION) {
                                      /* JE ->0x7BDFA (JMP to increment) at
                                         131:0x7BDEC  160:=  com1:= */
                    _attacker_sees_illusions = ST_TRUE;
                                      /* 131:0x7BDF4  160:=  com1:= */
                }
                                      /* JMP ->0x7BE2F (loop increment) at
                                         131:0x7BDFA  160:=  com1:= */
            } else if ((int8_t)bu->controller_idx == _combat_defender_player) {
                                      /* JNE ->0x7BE2F (loop increment) at
                                         131:0x7BE09  160:=  com1:= */
                if (bu->Attribs_1 & USA_IMMUNITY_ILLUSION) {
                                      /* JE ->0x7BE2F (loop increment) at
                                         131:0x7BE21  160:=  com1:= */
                    _defender_sees_illusions = ST_TRUE;
                                      /* 131:0x7BE29  160:=  com1:= */
                }
            }
        }

        ++battle_unit_idx;            /* 131:0x7BE2F  160:=  com1:= */
                                      /* signed JGE ->0x7BE39 (epilogue) at
                                         131:0x7BE30  160:=  com1:= */
                                      /* loop-back JMP ->0x7BDB3 at
                                         131:0x7BE36  160:=  com1:= */
    }
}                                     /* POP BP / RETF at 131:0x7BE39  160:=  com1:= */

/* Exported target 0370:002A, reconstructed by R6.5b. */
void __far Battle_Unit_Heal(int16_t battle_unit_idx, int16_t healing, int16_t temp_hits)
{
    int16_t damages[NUM_DAMAGE_TYPES];
    int16_t saved_movement;
    int16_t healable_damage;
    int16_t top_figure_damage;
    int16_t i;
    struct s_BATTLE_UNIT __far *bu = &_battle_units[battle_unit_idx];
                                      /* signed index * raw record size 0x006E;
                                         131:0x7FCC2  160:=  com1:= */

#if BUILD == CP160
    healable_damage = (uint8_t)bu->damage[DMG_UNDEATH]
                    + (uint8_t)bu->damage[DMG_REGULAR];
                                      /* zero-extended byte sum;
                                         131:—  160:0x7FCC5..0x7FCE0  com1:— */
    uint16_t irreversible_div_ax =
        ((uint8_t)bu->damage[DMG_IRREVERSIBLE] / (uint8_t)bu->hits)
        | (((uint16_t)((uint8_t)bu->damage[DMG_IRREVERSIBLE]
                     % (uint8_t)bu->hits)) << 8);
                                      /* DIV CL: quotient AL, remainder AH, packed word stored;
                                         131:—  160:0x7FCE0..0x7FCEF  com1:— */
#else
    healable_damage = (uint8_t)bu->damage[DMG_UNDEATH]
                    + (uint8_t)bu->damage[DMG_REGULAR];
                                      /* zero-extended byte sum;
                                         131:0x7FCC5..0x7FCF2  160:—  com1:= */
#endif

    top_figure_damage = 0;            /* 131:0x7FCF2  160:=  com1:= */
    if (temp_hits == TEMP_HITS_DISABLED) {
                                      /* JNE ->0x7FD0B, damage snapshot;
                                         131:0x7FCF7  160:=  com1:= */
        if (healing > healable_damage) {
                                      /* JLE ->0x7FD0B, damage snapshot;
                                         131:0x7FCFD  160:=  com1:= */
            healing = healable_damage;
                                      /* 131:0x7FD05  160:=  com1:= */
        }
    }

    damages[DMG_REGULAR] = (uint8_t)bu->damage[DMG_REGULAR];
                                      /* 131:0x7FD0B..0x7FD21  160:=  com1:= */
    damages[DMG_UNDEATH] = (uint8_t)bu->damage[DMG_UNDEATH];
                                      /* 131:0x7FD21..0x7FD37  160:=  com1:= */
    damages[DMG_IRREVERSIBLE] = (uint8_t)bu->damage[DMG_IRREVERSIBLE];
                                      /* 131:0x7FD37..0x7FD4D  160:=  com1:= */
    damages[DMG_REGULAR] -= healing; /* 131:0x7FD4D  160:=  com1:= */
    if (damages[DMG_REGULAR] < 0) {
                                      /* JGE ->0x7FD6F, write-back loop;
                                         131:0x7FD53  160:=  com1:= */
        damages[DMG_UNDEATH] += damages[DMG_REGULAR];
                                      /* 131:0x7FD59  160:=  com1:= */
        damages[DMG_REGULAR] = 0;     /* 131:0x7FD5F  160:=  com1:= */
        if (damages[DMG_UNDEATH] < 0) {
                                      /* JGE ->0x7FD6F, write-back loop;
                                         131:0x7FD64  160:=  com1:= */
            damages[DMG_UNDEATH] = 0;/* 131:0x7FD6A  160:=  com1:= */
        }
    }

    for (i = 0; i < NUM_DAMAGE_TYPES; ++i) {
                                      /* init 131:0x7FD6F  160:=  com1:=;
                                         test/JL ->0x7FD73 at 131:0x7FD94  160:=  com1:= */
        bu->damage[i] = (uint8_t)damages[i];
                                      /* low byte of each 16-bit local, assignment not addition;
                                         131:0x7FD73..0x7FD93  160:=  com1:= */
    }

    bu->front_figure_damage =
        (int8_t)((uint8_t)bu->front_figure_damage - (uint8_t)healing);
                                      /* byte SUB, byte store, then signed test;
                                         131:0x7FD99..0x7FDC0  160:=  com1:= */
    if ((int8_t)bu->front_figure_damage < 0) {
                                      /* JL ->0x7FDD7, negative handler;
                                         131:0x7FDC0  160:=  com1:= */
        top_figure_damage = (int8_t)bu->front_figure_damage;
                                      /* CBW sign extension;
                                         131:0x7FDD7..0x7FDEC  160:=  com1:= */
        bu->front_figure_damage = 0;  /* 131:0x7FDEC..0x7FDFE  160:=  com1:= */

        for (;;) {
                                      /* entry JMP ->0x7FE26 at 131:0x7FDFE  160:=  com1:=;
                                         loop JG ->0x7FE00 at 131:0x7FE50  160:=  com1:= */
            if (top_figure_damage >= 0)
                                      /* JGE ->0x7FE52, positive-remainder test;
                                         131:0x7FE26  160:=  com1:= */
                break;

#if BUILD == CP160
            if ((int8_t)((uint8_t)bu->Max_Figures
                        - (uint8_t)irreversible_div_ax)
                <= (int8_t)bu->Cur_Figures)
                                      /* byte SUB; signed JG ->0x7FE00 otherwise;
                                         131:—  160:0x7FE2C..0x7FE52  com1:— */
                break;
            /* 160:0x7FE40 EB 0A skips 0x7FE42..0x7FE4B patch residue and lands on
               the live compare at 0x7FE4C. 131:— 160:0x7FE40..0x7FE4C com1:— */
#else
            if ((int8_t)bu->Max_Figures <= (int8_t)bu->Cur_Figures)
                                      /* signed JG ->0x7FE00 otherwise;
                                         131:0x7FE2C..0x7FE52  160:—  com1:= */
                break;
#endif

            ++bu->Cur_Figures;        /* 131:0x7FE00..0x7FE11  160:=  com1:= */
            top_figure_damage += (int8_t)bu->hits;
                                      /* CBW and 16-bit add;
                                         131:0x7FE11..0x7FE26  160:=  com1:= */
        }

        if (top_figure_damage > 0) {
                                      /* JLE ->0x7FE6C, temp-hits gate;
                                         131:0x7FE52  160:=  com1:= */
#if BUILD == MOM131
            bu->front_figure_damage = (int8_t)(uint8_t)top_figure_damage;
                                      /* 131:0x7FE58..0x7FE6C  160:—  com1:— */
#else
            uint8_t saved_remainder = (uint8_t)top_figure_damage;
                                      /* MOV AL,[BP-2]; 131:—  160:0x7FE58  com1:= */
            *(uint8_t *)&top_figure_damage = 0;
                                      /* low-byte clear; 131:—  160:0x7FE5B  com1:= */
            /* Nine NOP bytes preserve layout at 131:— 160:0x7FE5F..0x7FE68 com1:=. */
            bu->front_figure_damage = (int8_t)saved_remainder;
                                      /* delayed AL store; 131:—  160:0x7FE68  com1:= */
#endif
        }
    } else {
                                      /* JMP ->0x7FE6C, temp-hits gate;
                                         131:0x7FDD4  160:=  com1:= */
    }

    if (temp_hits == TEMP_HITS_DISABLED) {
                                      /* JNE ->0x7FE7D, abs call setup;
                                         131:0x7FE6C  160:=  com1:= */
        if (top_figure_damage < 0) {
                                      /* JGE ->0x7FE7D, abs call setup;
                                         131:0x7FE72  160:=  com1:= */
            top_figure_damage = 0;    /* 131:0x7FE78  160:=  com1:= */
        }
    }
    top_figure_damage = abs(top_figure_damage);
                                      /* lcall 0000:02C8 ->0x02CC8;
                                         131:0x7FE7D..0x7FE89  160:=  com1:= */

#if BUILD == MOM131
    if ((int16_t)(int8_t)bu->Max_Figures <= top_figure_damage) {
                                      /* signed compare; JG ->0x7FEE2;
                                         131:0x7FE89..0x7FEA0  160:—  com1:— */
        int16_t extra_per_figure =
            top_figure_damage / (int16_t)(int8_t)bu->Max_Figures;
                                      /* CWD / signed IDIV BX;
                                         131:0x7FEA0..0x7FEC8  160:—  com1:— */
        bu->Extra_Hits = (uint8_t)(bu->Extra_Hits + extra_per_figure);
                                      /* byte wrap; 131:0x7FEC8..0x7FEE2  160:—  com1:— */
    }
#elif BUILD == CP160
    uint8_t effective_max =
        (uint8_t)((uint8_t)bu->Max_Figures - (uint8_t)irreversible_div_ax);
                                      /* 131:—  160:0x7FE89..0x7FE9D  com1:— */
    if ((int8_t)effective_max <= (int8_t)(uint8_t)top_figure_damage) {
                                      /* signed low-byte compare; JG ->0x7FEE2;
                                         131:—  160:0x7FE9D  com1:— */
        if (effective_max != 0) {
                                      /* JE ->0x7FEE2, zero-divisor exit;
                                         131:—  160:0x7FEA4  com1:— */
            uint8_t extra_per_figure =
                (uint16_t)top_figure_damage / effective_max;
                                      /* unsigned DIV DL, quotient AL;
                                         131:—  160:0x7FEA8..0x7FEAE  com1:— */
            bu->Extra_Hits = (uint8_t)(bu->Extra_Hits + extra_per_figure);
                                      /* byte ADD; 131:—  160:0x7FEAA  com1:— */

            uint16_t irreversible =
                (uint16_t)extra_per_figure * (uint8_t)irreversible_div_ax
                + (uint8_t)bu->damage[DMG_IRREVERSIBLE];
                                      /* unsigned byte MUL, zero-extended old byte, word add;
                                         131:—  160:0x7FEAE..0x7FEBB  com1:— */
            if ((int16_t)irreversible > CP160_IRREVERSIBLE_DAMAGE_CAP) {
                                      /* signed JLE ->0x7FEC2 store;
                                         131:—  160:0x7FEBB  com1:— */
                irreversible = (irreversible & WORD_HIGH_BYTE_MASK)
                               | CP160_IRREVERSIBLE_DAMAGE_CAP;
                                      /* MOV AL,0xC8 preserves AH;
                                         131:—  160:0x7FEC0  com1:— */
            }
            bu->damage[DMG_IRREVERSIBLE] = (uint8_t)irreversible;
                                      /* low-byte store; 131:—  160:0x7FEC2  com1:— */
        }
    }
    /* 160:0x7FEC6 EB 1A skips stale 0x7FEC8..0x7FEE1 code ending in the old
       Extra_Hits store at 0x7FEDE. 131:— 160:0x7FEC6..0x7FEE2 com1:— */
#else /* COM1 */
    if ((int16_t)(int8_t)bu->Max_Figures <= top_figure_damage) {
                                      /* signed threshold; JG ->0x7FEE2;
                                         131:—  160:—  com1:0x7FE89..0x7FEA0 */
        int16_t extra_per_figure =
            top_figure_damage / (int16_t)(uint8_t)bu->Max_Figures;
                                      /* zero-extended divisor, CWD / signed IDIV CX;
                                         131:—  160:—  com1:0x7FEA0..0x7FEBB */
        int16_t new_extra_hits = (int16_t)(int8_t)bu->Extra_Hits + extra_per_figure;
                                      /* signed old byte plus quotient;
                                         131:—  160:—  com1:0x7FEBB..0x7FEC2 */
        if (new_extra_hits >= COM1_EXTRA_HITS_CAP) {
                                      /* signed JL ->0x7FECA otherwise;
                                         131:—  160:—  com1:0x7FEC2 */
            new_extra_hits = COM1_EXTRA_HITS_CAP;
                                      /* 131:—  160:—  com1:0x7FEC7 */
        }
        bu->Extra_Hits = (uint8_t)new_extra_hits;
                                      /* 131:—  160:—  com1:0x7FECA */
    }
    /* Twenty NOP bytes at 131:— 160:— com1:0x7FECE..0x7FEE2. */
#endif

    saved_movement = (int8_t)bu->movement_points;
                                      /* 131:0x7FEE2..0x7FEF7  160:=  com1:= */
    BU_Construct(bu);                /* lcall 03A0:003E ->0x8EDFD;
                                         131:0x7FEF7..0x7FF10  160:=  com1:= */
    BU_Apply_Battlefield_Effects(bu);/* lcall 03A0:0052 ->0x8FF09;
                                         131:0x7FF10..0x7FF29  160:=  com1:= */
    bu->movement_points = (int8_t)saved_movement;
                                      /* 131:0x7FF29..0x7FF3D  160:=  com1:= */
}                                     /* POP DI/SI, frame teardown, RETF;
                                         131:0x7FF3D..0x7FF43  160:=  com1:= */

/* Exported target 03D0:004D, reconstructed by R6.5d. */
void __far Calc_Battlefield_Bonuses(int16_t combat_structure)
{
    int16_t side;
    int16_t unit_i;
    int16_t controller;
    int16_t leadership_candidate;

    /* 131:0x9A8B3  160:=  com1:= */
    if (battlefield->city_enchantments[CITY_ENCHANT_CLOUD_OF_SHADOW] > 0) {
        combat_enchantments[CE_DARKNESS_DEFENDER] = COMBAT_ENCHANTMENT_FROM_CITY;
                                      /* 131:0x9A8BF  160:=  com1:= */
    }

#if BUILD == MOM131 || BUILD == CP160
    if (battlefield->city_enchantments[CITY_ENCHANT_HEAVENLY_LIGHT] > 0) {
                                      /* 131:0x9A8C8  160:=  com1:— */
        combat_enchantments[CE_TRUE_LIGHT_DEFENDER] = COMBAT_ENCHANTMENT_FROM_CITY;
                                      /* 131:0x9A8D4  160:=  com1:— */
    }
#else
    goto com1_after_toblock_helper;   /* primary flow jumps over 0x9A8CA..0x9A8D2;
                                         131:—  160:—  com1:0x9A8C8 */
com1_after_toblock_helper:
    ;                                 /* ten NOP bytes through com1:0x9A8DC */
#endif

    for (side = 0; side < R6_5D_NUM_PLAYERS; ++side) {
                                      /* init/test/increment 131:0x9A8DD,0x9A930,0x9A931
                                         160:=  com1:= */
        if (R6_5D_PLAYER_GLOBAL(side, PLAYER_GLOBAL_ETERNAL_NIGHT) > 0
                                      /* 131:0x9A8E1  160:=  com1:= */
            && combat_enchantments[CE_TRUE_LIGHT_DEFENDER]
               != COMBAT_ENCHANTMENT_FROM_CITY) {
                                      /* 131:0x9A8F1  160:=  com1:= */
            if (side == _combat_attacker_player) {
                                      /* 131:0x9A8FC  160:=  com1:= */
                combat_enchantments[CE_DARKNESS_ATTACKER] =
                    COMBAT_ENCHANTMENT_FROM_GLOBAL;
                                      /* 131:0x9A902  160:=  com1:= */
            } else if (side == _combat_defender_player) {
                                      /* 131:0x9A90D  160:=  com1:= */
                combat_enchantments[CE_DARKNESS_DEFENDER] =
                    COMBAT_ENCHANTMENT_FROM_GLOBAL;
                                      /* 131:0x9A913  160:=  com1:= */
            } else {
                combat_enchantments[CE_DARKNESS_DEFENDER] =
                    COMBAT_ENCHANTMENT_FROM_GLOBAL;
                                      /* 131:0x9A91E  160:=  com1:= */
                combat_enchantments[CE_DARKNESS_ATTACKER] =
                    COMBAT_ENCHANTMENT_FROM_GLOBAL;
                                      /* 131:0x9A927  160:=  com1:= */
            }
        }
    }

    for (side = 0; side < BATTLEFIELD_BONUS_SLOTS; ++side) {
                                      /* init/test/increment 131:0x9A937,0x9A968,0x9A969
                                         160:=  com1:= */
#if BUILD == COM1
        uint16_t byte_i;
        for (byte_i = 0; byte_i < COM1_SPFX_BLOCK_BYTES; ++byte_i)
            ((uint8_t *)DSEG_COM1_SPFX_MAXIMA)[byte_i] = 0;
                                      /* MOV CX,0x23; PUSH DS/POP ES; XOR AL,AL;
                                         MOV DI,0x3AAC; REP STOSB;
                                         131:—  160:—  com1:0x9A93B..0x9A945 */
#endif
        battlefield_holy_bonus_max[side] = 0;
                                      /* 131:0x9A93B  160:=  com1:0x9A947 */
        battlefield_resist_prayer_max[side] = 0;
                                      /* 131:0x9A94A  160:=  com1:0x9A956 */
        battlefield_leadership_max[side] = 0;
                                      /* 131:0x9A959  160:=  com1:0x9A95F */
    }

#if BUILD == CP160 || BUILD == COM1
    *(uint16_t *)DSEG_PRAYER_SOURCE_FLAGS = 0;
                                      /* 131:—  160:0x9A96E  com1:= */
#endif

    for (unit_i = 0; unit_i < _combat_total_unit_count; ++unit_i) {
                                      /* condition/back edge 131:0x9A96E,0x9ACCF,0x9ACD0
                                         160:0x9A975,0x9ACCF,0x9ACD0  com1:= */
        struct s_BATTLE_UNIT __far *bu = &_battle_units[unit_i];
        leadership_candidate = 0;     /* 131:0x9A973  160:0x9A975  com1:= */

        if ((int8_t)bu->status != BUS_ACTIVE)
            continue;                 /* 131:0x9A978..0x9A98C  160:=  com1:= */

#if BUILD == MOM131
        if (combat_structure == COMBAT_STRUCTURE_CITY
                                      /* 131:0x9A98F  160:—  com1:— */
            && (int8_t)bu->controller_idx == _combat_defender_player) {
                                      /* 131:0x9A995  160:—  com1:— */
            bu->defense = (int8_t)(bu->defense + 3);
                                      /* byte add/store 131:0x9A9AD..0x9A9CF */
        }
#else
        if (combat_structure == COMBAT_STRUCTURE_CITY
                                      /* 131:—  160:0x9A98F  com1:= */
            && (battlefield->walled != 0 || battlefield->wall_of_fire != 0)
                                      /* 131:—  160:0x9A995  com1:= */
            && (int8_t)bu->controller_idx == _combat_defender_player) {
                                      /* 131:—  160:0x9A9AE  com1:= */
            bu->defense = (int8_t)(bu->defense + 2);
                                      /* 131:—  160:0x9A9C6  com1:= */
        }
#endif

        controller = (int8_t)bu->controller_idx;
                                      /* 131:0x9A9D3  160:=  com1:0x9A9CB */

        if ((bu->Attribs_2 & BU_ATTRIBS2_HOLY_BONUS) != 0
                                      /* 131:0x9A9E7  160:=  com1:0x9A9F8 */
            && (int16_t)(int8_t)bu->Spec_Att_Attrib
               > battlefield_holy_bonus_max[controller]) {
            battlefield_holy_bonus_max[controller] =
                (int8_t)bu->Spec_Att_Attrib;
                                      /* 131:0x9AA1C  160:=  com1:0x9AA20 */
        }

        if ((bu->Attribs_2 & BU_ATTRIBS2_RESIST_ALL) != 0
                                      /* 131:0x9AA3B  160:=  com1:0x9AA3F */
            && (int16_t)(int8_t)bu->Spec_Att_Attrib
               > battlefield_resist_prayer_max[controller]) {
            battlefield_resist_prayer_max[controller] =
                (int8_t)bu->Spec_Att_Attrib;
                                      /* 131:0x9AA70  160:=  com1:0x9AA74 */
#if BUILD == CP160 || BUILD == COM1
            prayer_source_flags[controller == _combat_defender_player
                ? PRAYER_SOURCE_DEFENDER_SLOT : PRAYER_SOURCE_OTHER_SLOT] = 1;
                                      /* 131:—  160:0x9AA73  com1:0x9AA77 */
#endif
        }

#if BUILD == CP160 || BUILD == COM1
        if (0) {
            int16_t unreachable_ax;
            battlefield_resist_prayer_max[controller] = unreachable_ax;
                                      /* retained alternate store skipped by 0x9AA80/0x9AA84;
                                         131:—  160:0x9AA82..0x9AA8C  com1:0x9AA86..0x9AA90 */
        }
#endif

        struct s_UNIT __far *unit = &_UNITS[bu->unit_idx];
                                      /* 131:0x9AA8F  160:=  com1:0x9AA93 */
        if ((int8_t)unit->Hero_Slot < 0)
            continue;                 /* 131:0x9AAAF..0x9AAB1  160:=
                                         com1:0x9AA95..0x9AA9C */

#if BUILD == COM1
        int16_t level_plus_one = (int16_t)(int8_t)unit->Level + 1;
        struct s_HERO __far *hero =
            &_HEROES2[(int8_t)unit->owner_idx]->heroes[(uint8_t)unit->type];
                                      /* signed owner saved at com1:0x9A9ED; level/type/table
                                         setup at com1:0x9AAB9..0x9AAD8 */
#else
        struct s_HERO __far *hero =
            &_HEROES2[controller]->heroes[(uint8_t)unit->type];
                                      /* 131:0x9AAB4  160:=  com1:— */
#endif

#if BUILD == MOM131
        int16_t level_plus_one = (int16_t)(int8_t)unit->Level + 1;

        if ((hero->abilities & HSA_PRAYERMASTER) != 0) {
                                      /* 131:0x9AAF6  160:—  com1:— */
            int16_t v = level_plus_one; /* 131:0x9AAF8  160:—  com1:— */
            if (v > battlefield_resist_prayer_max[controller])
                                      /* 131:0x9AB1C  160:—  com1:— */
                battlefield_resist_prayer_max[controller] = v;
                                      /* 131:0x9AB2E  160:—  com1:— */
        }
        if ((hero->abilities & HSA_PRAYERMASTER2) != 0) {
                                      /* 131:0x9AB70  160:—  com1:— */
            int16_t v = (int16_t)(level_plus_one * 3) / 2;
                                      /* CWD/SUB/SAR signed correction;
                                         131:0x9AB82..0x9ABAD  160:—  com1:— */
            if (v > battlefield_resist_prayer_max[controller])
                                      /* 131:0x9ABB0  160:—  com1:— */
                battlefield_resist_prayer_max[controller] = v;
                                      /* 131:0x9ABC2  160:—  com1:— */
        }
        if ((hero->abilities & HSA_LEADERSHIP) != 0)
                                      /* 131:0x9AC04  160:—  com1:— */
            leadership_candidate = level_plus_one / 3;
                                      /* signed CWD/IDIV 131:0x9AC16  160:—  com1:— */
        if ((hero->abilities & HSA_LEADERSHIP2) != 0)
                                      /* 131:0x9AC72  160:—  com1:— */
            leadership_candidate = level_plus_one / 2;
                                      /* signed correction 131:0x9AC84  160:—  com1:— */

#elif BUILD == CP160
        uint16_t level_plus_one = (uint16_t)(uint8_t)unit->Level + 1;
                                      /* MOV CL,[+0x0C]; XOR CH,CH; INC CX;
                                         131:—  160:0x9AADA  com1:— */
        uint16_t prayer_bits = (hero->abilities >> 16)
                             & HSA_PRAYERMASTER_MASK_HI;
                                      /* raw mask 0x0300; 131:—  160:0x9AAF0  com1:— */
        if (prayer_bits != 0) {
            int16_t v = level_plus_one; /* 131:—  160:0x9AAFB  com1:— */
            if (prayer_bits != (HSA_PRAYERMASTER >> 16))
                                      /* XCHG AL,AH; DEC AX; JE;
                                         131:—  160:0x9AAFD  com1:— */
                v = (int16_t)(v + ((uint16_t)v >> 1));
                                      /* 131:—  160:0x9AB02  com1:— */
            if (v > battlefield_resist_prayer_max[controller]) {
                                      /* 131:—  160:0x9AB06  com1:— */
                battlefield_resist_prayer_max[controller] = v;
                                      /* 131:—  160:0x9AB4D  com1:— */
                prayer_source_flags[controller == _combat_defender_player
                    ? PRAYER_SOURCE_DEFENDER_SLOT : PRAYER_SOURCE_OTHER_SLOT] = 1;
                                      /* 131:—  160:0x9AB50  com1:— */
            }
        }

        uint16_t leadership_bits = hero->abilities & HSA_LEADERSHIP_MASK_LO;
                                      /* raw mask 0x0003; 131:—  160:0x9AB1C  com1:— */
        if (leadership_bits == 0)
            continue;                 /* 131:—  160:0x9AB25  com1:— */
        if (leadership_bits == HSA_LEADERSHIP)
            leadership_candidate = (int16_t)level_plus_one / 3;
                                      /* 131:—  160:0x9AB29..0x9AB34  com1:— */
        else
            leadership_candidate = (uint16_t)level_plus_one >> 1;
                                      /* logical SHR; 131:—  160:0x9AB36  com1:— */
        if (leadership_candidate > battlefield_leadership_max[controller])
                                      /* 131:—  160:0x9AB38  com1:— */
            battlefield_leadership_max[controller] = leadership_candidate;
                                      /* 131:—  160:0x9AB47  com1:— */
        continue;                     /* 131:—  160:0x9AB4A  com1:— */

#else /* COM1 */
        if ((hero->abilities & HSA_PRAYERMASTER) != 0) {
                                      /* 131:—  160:—  com1:0x9AADC */
            int16_t v = (int16_t)(((uint16_t)level_plus_one & 0xFF00)
                        | ((uint8_t)level_plus_one >> 1));
                                      /* INC AX then SHR AL only; 131:—  160:—
                                         com1:0x9AAE7..0x9AAED */
            if (v > battlefield_resist_prayer_max[controller]) {
                                      /* 131:—  160:—  com1:0x9AAF0 */
                battlefield_resist_prayer_max[controller] = v;
                                      /* 131:—  160:—  com1:0x9AB02 */
                prayer_source_flags[controller == _combat_defender_player
                    ? PRAYER_SOURCE_DEFENDER_SLOT : PRAYER_SOURCE_OTHER_SLOT] = 1;
                                      /* 131:—  160:—  com1:0x9AB05 */
            }
        }

        if (((uint8_t __far *)hero)[3] & COM1_HERO_BYTE_03_UNKNOWN_40) {
                                      /* 131:—  160:—  com1:0x9AB14 */
            int8_t v = (int8_t)(level_plus_one / 3);
                                      /* signed byte IDIV DL; 131:—  160:—  com1:0x9AB1B */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_1][controller])
                                      /* 131:—  160:—  com1:0x9AB22 */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_1][controller] = v;
                                      /* 131:—  160:—  com1:0x9AB28 */
        }
        if (((uint8_t __far *)hero)[4] & COM1_HERO_BYTE_04_UNKNOWN_02) {
                                      /* 131:—  160:—  com1:0x9AB2C */
            int8_t v = (int8_t)(level_plus_one / 2);
                                      /* signed byte IDIV DL; 131:—  160:—  com1:0x9AB33 */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_2][controller])
                                      /* 131:—  160:—  com1:0x9AB3A */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_2][controller] = v;
                                      /* 131:—  160:—  com1:0x9AB40 */
        }
        if (((uint8_t __far *)hero)[4] & COM1_HERO_BYTE_04_UNKNOWN_10) {
                                      /* 131:—  160:—  com1:0x9AB44 */
            int16_t product = (int16_t)(int8_t)(uint8_t)level_plus_one * 3;
            int8_t v = (int8_t)(product / 4);
                                      /* signed byte IMUL then IDIV; 131:—  160:—
                                         com1:0x9AB4B..0x9AB54 */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_2][controller])
                                      /* 131:—  160:—  com1:0x9AB56 */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_2][controller] = v;
                                      /* 131:—  160:—  com1:0x9AB5C */
        }
        if (((uint8_t __far *)hero)[0x0B] & COM1_HERO_BYTE_0B_UNKNOWN_08) {
                                      /* 131:—  160:—  com1:0x9AB60 */
            if (2 > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_0][controller])
                                      /* 131:—  160:—  com1:0x9AB67 */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_0][controller] = 2;
                                      /* 131:—  160:—  com1:0x9AB70 */
        }
        if (((uint8_t __far *)hero)[0x0B] & COM1_HERO_BYTE_0B_UNKNOWN_10) {
                                      /* 131:—  160:—  com1:0x9AB74 */
            int8_t v = (int8_t)(level_plus_one / 3);
                                      /* 131:—  160:—  com1:0x9AB7B */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_3][controller])
                                      /* 131:—  160:—  com1:0x9AB82 */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_3][controller] = v;
                                      /* 131:—  160:—  com1:0x9AB88 */
        }
        if (((uint8_t __far *)hero)[0x0B] & COM1_HERO_BYTE_0B_UNKNOWN_20) {
                                      /* 131:—  160:—  com1:0x9AB8C */
            int8_t v = (int8_t)(level_plus_one / 2);
                                      /* 131:—  160:—  com1:0x9AB93 */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_3][controller])
                                      /* 131:—  160:—  com1:0x9AB9A */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_3][controller] = v;
                                      /* 131:—  160:—  com1:0x9ABA0 */
        }
        if (((uint8_t __far *)hero)[0x0B] & COM1_HERO_BYTE_0B_UNKNOWN_40) {
                                      /* 131:—  160:—  com1:0x9ABA4 */
            int8_t v = (int8_t)(level_plus_one / 2);
                                      /* 131:—  160:—  com1:0x9ABAB */
            if (v > com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_4][controller])
                                      /* 131:—  160:—  com1:0x9ABB2 */
                com1_spfx_max[COM1_SPFX_GROUP_UNKNOWN_4][controller] = v;
                                      /* 131:—  160:—  com1:0x9ABB8 */
        }

        if ((hero->abilities & HSA_PRAYERMASTER2) != 0) {
                                      /* 131:—  160:—  com1:0x9ABC4 */
            uint8_t half = (uint8_t)level_plus_one >> 1;
            int16_t v = (int16_t)(((uint16_t)level_plus_one & 0xFF00)
                        | (uint8_t)(half + (half >> 1)));
                                      /* AL-only shifts/add preserve AH; 131:—  160:—
                                         com1:0x9ABD3..0x9ABDC */
            if (v > battlefield_resist_prayer_max[controller]) {
                                      /* 131:—  160:—  com1:0x9ABE3 */
                battlefield_resist_prayer_max[controller] = v;
                                      /* 131:—  160:—  com1:0x9ABF5 */
                prayer_source_flags[controller == _combat_defender_player
                    ? PRAYER_SOURCE_DEFENDER_SLOT : PRAYER_SOURCE_OTHER_SLOT] = 1;
                                      /* 131:—  160:—  com1:0x9ABF8 */
            }
        }
        if ((hero->abilities & HSA_LEADERSHIP) != 0)
                                      /* 131:—  160:—  com1:0x9AC05 */
            leadership_candidate = level_plus_one / 3;
                                      /* signed CWD/IDIV; 131:—  160:—  com1:0x9AC0C */
        goto com1_after_spfx_mana_helper;
                                      /* primary jumps over helper at 0x9AC1B..0x9AC8E;
                                         131:—  160:—  com1:0x9AC18 */
com1_after_spfx_mana_helper:
        if ((hero->abilities & HSA_LEADERSHIP2) != 0)
                                      /* 131:—  160:—  com1:0x9AC9B */
            leadership_candidate = level_plus_one / 2;
                                      /* signed correction; 131:—  160:—  com1:0x9ACA2 */
#endif

#if BUILD != CP160
        if (leadership_candidate > battlefield_leadership_max[controller])
                                      /* 131:0x9ACAD  160:—  com1:= */
            battlefield_leadership_max[controller] = leadership_candidate;
                                      /* 131:0x9ACBF  160:—  com1:= */
#endif
    }

    for (side = 0;
#if BUILD == MOM131
         side < R6_5D_NUM_PLAYERS;
#else
         side < BATTLEFIELD_BONUS_SLOTS;
#endif
         ++side) {                    /* init/test/increment 131:0x9ACD9,0x9ACF7,0x9ACF8
                                         160:=  com1:= */
        battlefield_resist_prayer_max[side] += battlefield_holy_bonus_max[side];
                                      /* 131:0x9ACDD..0x9ACF4  160:=  com1:= */
    }

#if BUILD == COM1
    goto COM1_RELOCATED_BATTLE_UNIT_TAIL_0x99874;
                                      /* near JMP outside the extent; 131:—  160:—
                                         com1:0x9ACFE */
#else
    return;                           /* far epilogue/RETF 131:0x9ACFE..0x9AD03
                                         160:=  com1:— */
#endif
}

#if BUILD == CP160
/* No live edge enters 0x9AB5F..0x9ACCF. Entry AX has no predecessor; the retained
 * body is the superseded MoM hero tail and is represented to preserve semantic bytes. */
static void r6_5d_cp_unreachable_hero_tail(int16_t unit_i,
                                           int16_t controller,
                                           uint16_t entry_ax)
{
    struct s_UNIT __far *unit = &_UNITS[_battle_units[unit_i].unit_idx];
    uint16_t hero_byte_offset = (uint16_t)(entry_ax * 0x000C);
                                      /* 131:—  160:0x9AB5F  com1:— */
    struct s_HERO __far *hero = (struct s_HERO __far *)
        ((uint8_t __far *)_HEROES2[controller] + hero_byte_offset);
                                      /* 131:—  160:0x9AB64  com1:— */
    int16_t level_plus_one = (int16_t)(int8_t)unit->Level + 1;
    int16_t leadership_candidate;

    if ((hero->abilities & HSA_PRAYERMASTER2) != 0) {
                                      /* 131:—  160:0x9AB70  com1:— */
        int16_t v = (int16_t)(level_plus_one * 3) / 2;
                                      /* 131:—  160:0x9AB82  com1:— */
        if (v > battlefield_resist_prayer_max[controller])
                                      /* 131:—  160:0x9ABB0  com1:— */
            battlefield_resist_prayer_max[controller] = v;
                                      /* 131:—  160:0x9ABC2  com1:— */
    }
    if ((hero->abilities & HSA_LEADERSHIP) != 0)
                                      /* 131:—  160:0x9AC04  com1:— */
        leadership_candidate = level_plus_one / 3;
                                      /* 131:—  160:0x9AC16  com1:— */
    if ((hero->abilities & HSA_LEADERSHIP2) != 0)
                                      /* 131:—  160:0x9AC72  com1:— */
        leadership_candidate = level_plus_one / 2;
                                      /* 131:—  160:0x9AC84  com1:— */
    if (leadership_candidate > battlefield_leadership_max[controller])
                                      /* 131:—  160:0x9ACAD  com1:— */
        battlefield_leadership_max[controller] = leadership_candidate;
                                      /* 131:—  160:0x9ACBF  com1:— */
}
#endif

int16_t __far Check_Attack_Ranged(int16_t attacker_battle_unit_idx,
                                  int16_t defender_battle_unit_idx)
{
    uint32_t defender_enchantments =
          _battle_units[defender_battle_unit_idx].enchantments
        | _battle_units[defender_battle_unit_idx].item_enchantments
        | _UNITS[_battle_units[defender_battle_unit_idx].unit_idx].enchantments;
                                      /* 131:0x876CE..0x87726  160:=  com1:= */
    uint32_t attacker_enchantments =
          _battle_units[attacker_battle_unit_idx].enchantments
        | _battle_units[attacker_battle_unit_idx].item_enchantments
        | _UNITS[_battle_units[attacker_battle_unit_idx].unit_idx].enchantments;
                                      /* 131:0x87729..0x87781  160:=  com1:= */
    int16_t result = CHECK_RANGED_VISIBLE;

    if ((attacker_enchantments & UE_TRUE_SIGHT)
                                      /* high-word mask 0x0040; JNE ->0x877AE at
                                         131:0x87797  160:=  com1:= */
        || (_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_IMMUNITY_ILLUSION)) {
                                      /* JE ->0x877B5 at 131:0x877AC  160:=  com1:= */
        result = CHECK_RANGED_VISIBLE;
    } else if ((defender_enchantments & UE_INVISIBILITY)
                                      /* low-word mask 0x8000; JNE ->0x877DB at
                                         131:0x877C4  160:=  com1:= */
               || (_battle_units[defender_battle_unit_idx].Abilities & UA_INVISIBILITY)) {
                                      /* JE ->0x877E0 at 131:0x877D9  160:=  com1:= */
        result = CHECK_RANGED_INVISIBLE;
    }

    if (battlefield->wall_of_darkness == ST_TRUE
                                      /* JNE ->return at 131:0x877EA  160:=  com1:= */
#if BUILD == MOM131
        && !(attacker_enchantments & UE_TRUE_SIGHT)
                                      /* JNE ->0x87818 at 131:0x877FA */
#else
        && !(_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_IMMUNITY_ILLUSION)
                                      /* 75 1C ->0x8781A at 160:0x877FC  com1:0x877FC */
#endif
        && overlay_03E0_0052(defender_battle_unit_idx) == ST_TRUE
                                      /* 9A 52 00 E0 03; 131:0x877FD
                                         160:0x877FF  com1:0x877FF */
        && overlay_03E0_0052(attacker_battle_unit_idx) == ST_FALSE) {
                                      /* 9A 52 00 E0 03; 131:0x87809
                                         160:0x8780B  com1:0x8780B */
        result = CHECK_RANGED_DARKNESS;
    }
    return result;
}

int16_t __far Eliminated_Opponent(void)
{
    int16_t attacker_side = 0;
    int16_t defender_side = 0;
    int16_t i;

    for (i = 0; i < _combat_total_unit_count; ++i) {
                                      /* JL ->0x8847D at 131:0x884F8  160:=  com1:= */
        struct s_BATTLE_UNIT __far *bu = &_battle_units[i];
        if ((int8_t)bu->status != BUS_ACTIVE)
            continue;                 /* JNE ->0x884F3 at 131:0x8848F  160:=  com1:= */
        if ((int8_t)bu->controller_idx == _combat_attacker_player) {
                                      /* JNE ->0x884C3 at 131:0x884A7  160:=  com1:= */
            if ((uint8_t)bu->Confusion_State == CONFUSION_SWITCHED_SIDES)
                                      /* JNE ->0x884C0 at 131:0x884BB  160:=  com1:= */
                ++defender_side;
            else
                ++attacker_side;
        } else if ((int8_t)bu->controller_idx == _combat_defender_player) {
                                      /* JNE ->0x884F3 at 131:0x884D9  160:=  com1:= */
            if ((uint8_t)bu->Confusion_State == CONFUSION_SWITCHED_SIDES)
                                      /* JNE ->0x884F2 at 131:0x884ED  160:=  com1:= */
                ++attacker_side;
            else
                ++defender_side;
        }
    }

    if (attacker_side == 0)
        return _combat_defender_player; /* 131:0x884FC..0x884FE  160:=  com1:= */
    if (defender_side == 0)
        return _combat_attacker_player; /* 131:0x88505..0x88507  160:=  com1:= */
    return ST_UNDEFINED;              /* 131:0x8850C  160:=  com1:= */
}

int16_t __far Combat_Grid_Cell_Has_City_Wall(int16_t cgx, int16_t cgy)
{
    int16_t result = ST_FALSE;
    if (battlefield->walled == ST_TRUE
                                      /* JNE ->0x9F0AA at 131:0x9F05D  160:=  com1:= */
        && cgx >= CITY_WALL_BOX_CGX_FIRST
                                      /* JL ->0x9F0AA at 131:0x9F062  160:=  com1:= */
        && cgx <= CITY_WALL_BOX_CGX_LAST
                                      /* JG ->0x9F0AA at 131:0x9F067  160:=  com1:= */
        && cgy >= CITY_WALL_BOX_CGY_FIRST
                                      /* JL ->0x9F0AA at 131:0x9F06C  160:=  com1:= */
        && cgy <= CITY_WALL_BOX_CGY_LAST
                                      /* JG ->0x9F0AA at 131:0x9F071  160:=  com1:= */
        && !((cgx == WALL_PATCH_X_FIRST || cgx == WALL_PATCH_X_LAST)
                                      /* JE ->0x9F07D / JNE ->0x9F087 at
                                         131:0x9F076/0x9F07B  160:=  com1:= */
             && (cgy == WALL_PATCH_Y_FIRST || cgy == WALL_PATCH_Y_LAST))
                                      /* JE ->0x9F0AA at 131:0x9F080/0x9F085  160:=  com1:= */
        && battlefield->walls[cgy - CITY_WALL_BOX_CGY_FIRST]
                             [cgx - CITY_WALL_BOX_CGX_FIRST] == ST_TRUE) {
                                      /* row stride 8, column stride 2; JNE ->0x9F0AA at
                                         131:0x9F087..0x9F0A5  160:=  com1:= */
        result = ST_TRUE;
    }
    return result;
}

int16_t __far Battle_Unit_Is_Summoned_Creature(int16_t battle_unit_idx)
{
    int16_t unit_type = (uint8_t)_UNITS[_battle_units[battle_unit_idx].unit_idx].type;
                                      /* 131:0x9F0B6..0x9F0D8  160:=  com1:= */
    if (_SPELL_DATA[SPELL_FIRE_ELEMENTAL].unit_type == unit_type
                                      /* JNE ->0x9F0EA at 131:0x9F0E3  160:=  com1:= */
        || _SPELL_DATA[SPELL_EARTH_ELEMENTAL].unit_type == unit_type
                                      /* JNE ->0x9F0F7 at 131:0x9F0F3  160:=  com1:= */
        || _SPELL_DATA[SPELL_PHANTOM_BEAST].unit_type == unit_type
                                      /* JNE ->0x9F104 at 131:0x9F100  160:=  com1:= */
        || _SPELL_DATA[SPELL_PHANTOM_WARRIORS].unit_type == unit_type
                                      /* JNE ->0x9F111 at 131:0x9F10D  160:=  com1:= */
        || _SPELL_DATA[SPELL_AIR_ELEMENTAL].unit_type == unit_type
                                      /* JNE ->0x9F11E at 131:0x9F11A  160:=  com1:= */
        || unit_type == UNIT_TYPE_DEMON)
                                      /* JNE ->0x9F126 at 131:0x9F122  160:=  com1:= */
        return ST_TRUE;
    return ST_FALSE;
}

void __far BU_AttackTarget(int16_t attacker_battle_unit_idx,
                           int16_t defender_battle_unit_idx,
                           int16_t defender_damage_types[NUM_DAMAGE_TYPES],
                           int16_t attacker_damage_types[NUM_DAMAGE_TYPES],
                           int16_t ranged_attack_flag,
                           int16_t SpFx)
{
    int16_t damage_types[NUM_DAMAGE_TYPES];
    int16_t Target_Damage_Sum;
    int16_t Figs;
    int16_t ranged_attack_check;
    int16_t Feared_Figures = 0;       /* 131:0x9929D  160:0x9929D  com1:0x9929D */
    int16_t Source_Unit_Damage;
    int16_t Can_Attack_Again;
    int16_t itr_damage_types;
#if BUILD == CP160
    int16_t Target_Damage_Running;    /* register CX, not a frame slot */
#endif
#if BUILD == COM1
    uint8_t first_strike_taken;
#endif

    for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
         ++itr_damage_types) {        /* 131:0x992A2  160:0x992A2  com1:0x992A2 */
        defender_damage_types[itr_damage_types] = 0;
                                      /* 131:0x992AF  160:0x992AF  com1:0x992AF */
        attacker_damage_types[itr_damage_types] = 0;
                                      /* 131:0x992BC  160:0x992BC  com1:0x992BC */
    }
    Source_Unit_Damage = 0;           /* 131:0x992C6  160:0x992C6  com1:0x992C6 */
    ranged_attack_check = overlay_0388_0043(attacker_battle_unit_idx,
                                             defender_battle_unit_idx);
                                      /* 131:0x992CF  160:0x992CF  com1:0x992CF */

    if (ranged_attack_flag == ST_TRUE) {
                                      /* 131:0x992D9  160:0x992D9  com1:0x992D9 */
#if BUILD == MOM131
        if ((int8_t)_battle_units[attacker_battle_unit_idx].ranged <= 0
                                      /* 131:0x992EF  160:—  com1:— */
#else
        if ((int8_t)_battle_units[attacker_battle_unit_idx].ranged_type <= 0
                                      /* 131:—  160:0x992EF  com1:0x992EF */
#endif
            || ranged_attack_check != 0) {
                                      /* 131:0x992F9  160:0x992F9  com1:0x992F9 */
            for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
                 ++itr_damage_types)  /* 131:0x99473  160:0x99473  com1:0x99473 */
                defender_damage_types[itr_damage_types] += RANGED_ATTACK_REFUSED;
                                      /* 131:0x99480  160:0x99480  com1:0x99480 */
            return;                   /* 131:0x99489  160:0x99489  com1:0x99489 */
        }

        BU_ProcessAttack(attacker_battle_unit_idx,
                         (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures,
                         defender_battle_unit_idx, am_Ranged, damage_types,
                         BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x99329  160:0x99329  com1:0x99329 */

#if BUILD == CP160
        Target_Damage_Running = 0;    /* CX; 131:—  160:0x99332  com1:— */
        for (itr_damage_types = NUM_DAMAGE_TYPES - 1; itr_damage_types >= 0;
             --itr_damage_types) {    /* word offsets 4,2,0; 160:0x9932F..0x99342 */
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:—  160:0x99334  com1:— */
            Target_Damage_Running += defender_damage_types[itr_damage_types];
                                      /* 131:—  160:0x9933E  com1:— */
        }
        Can_Attack_Again = 0;         /* 131:—  160:0x99357  com1:— */
#else
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types) {    /* 131:0x9932F  160:—  com1:0x9932F */
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x99347  160:—  com1:0x99347 */
        }
#endif

        if (!(_battle_units[attacker_battle_unit_idx].Combat_Effects & BUE_HASTE))
                                      /* 131:0x9935C  160:0x9935C  com1:0x9935C */
            return;                   /* 131:0x99364  160:0x99364  com1:0x99364 */

#if BUILD == MOM131
        Can_Attack_Again = 0;         /* 131:0x99367  160:—  com1:— */
        /* The preceding loop leaves itr_damage_types == 3; the binary indexes that slot. */
        if (RAT_CLASS((int8_t)_battle_units[itr_damage_types].ranged_type)
                == RAT_CLASS_MAGIC    /* 131:0x9936C..0x99387  160:—  com1:— */
            || (_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_CASTER_MASK)) {
                                      /* 131:0x99389..0x9939C  160:—  com1:— */
            if ((uint8_t)_battle_units[attacker_battle_unit_idx].mana
                    > MOM_HASTE_MANA_FLOOR) {
                                      /* 131:0x993AB  160:—  com1:— */
                _battle_units[attacker_battle_unit_idx].mana -= MOM_HASTE_MANA_COST;
                                      /* 131:0x993BF..0x993D4  160:—  com1:— */
                Can_Attack_Again = 1; /* 131:0x993D8  160:—  com1:— */
            }
        } else if ((int8_t)_battle_units[attacker_battle_unit_idx].ammo > 1) {
            Can_Attack_Again = 1;     /* 131:0x993F3  160:—  com1:— */
            --_battle_units[attacker_battle_unit_idx].ammo;
                                      /* 131:0x99405..0x9941A  160:—  com1:— */
        }
#elif BUILD == CP160
        /* No predecessor reaches this semantic patch block. */
        if (0) {
            Target_Damage_Running +=
                (int8_t)_battle_units[defender_battle_unit_idx].front_figure_damage;
                                      /* 131:—  160:0x99367..0x9936F  com1:— */
            if ((int8_t)_battle_units[defender_battle_unit_idx].hits
                    * (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures
                <= Target_Damage_Running)
                return;               /* 131:—  160:0x99371..0x9937E  com1:— */
        }
        if ((uint8_t)_battle_units[attacker_battle_unit_idx].ranged_type
                >= RAT_MAGIC_FIRST
            && (uint8_t)_battle_units[attacker_battle_unit_idx].ranged_type
                < RAT_MAGIC_LAST_EXCL
            && ((int8_t)_UNITS[_battle_units[attacker_battle_unit_idx].unit_idx].Hero_Slot
                    >= 0              /* 131:—  160:0x9938C..0x993A1  com1:— */
                || (_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_CASTER_MASK))) {
                                      /* 131:—  160:0x99380..0x993A9  com1:— */
            if ((uint8_t)_battle_units[attacker_battle_unit_idx].mana
                    >= MOM_HASTE_MANA_FLOOR) {
                _battle_units[attacker_battle_unit_idx].mana -= MOM_HASTE_MANA_COST;
                                      /* 131:—  160:0x993BF..0x993D4  com1:— */
                Can_Attack_Again = 1; /* 131:—  160:0x993D8  com1:— */
            }
        } else if ((int8_t)_battle_units[attacker_battle_unit_idx].ammo > 1) {
            Can_Attack_Again = 1;     /* 131:—  160:0x993F3  com1:— */
            --_battle_units[attacker_battle_unit_idx].ammo;
                                      /* 131:—  160:0x99405..0x9941A  com1:— */
        }
#elif BUILD == COM1
        Can_Attack_Again = 0;         /* 131:—  160:—  com1:0x99367 */
        (void)(RAT_CLASS((int8_t)_battle_units[itr_damage_types].ranged_type)
               == RAT_CLASS_MAGIC);  /* 131:—  160:—  com1:0x9936C..0x99388 */
        (void)(_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_CASTER_MASK);
                                      /* 131:—  160:—  com1:0x99389..0x9939B */
        goto com1_ammo_path;          /* EB 41; 131:—  160:—  com1:0x9939C */
        if (0) {
            if ((uint8_t)_battle_units[attacker_battle_unit_idx].mana
                    > COM1_HASTE_MANA_FLOOR) {
                                      /* 131:—  160:—  com1:0x993AB */
                _battle_units[attacker_battle_unit_idx].mana -= COM1_HASTE_MANA_COST;
                                      /* 131:—  160:—  com1:0x993BF..0x993D4 */
                Can_Attack_Again = 1; /* 131:—  160:—  com1:0x993D8 */
            }
        }
com1_ammo_path:
        if ((int8_t)_battle_units[attacker_battle_unit_idx].ammo > 1) {
            Can_Attack_Again = 1;     /* 131:—  160:—  com1:0x993F3 */
            --_battle_units[attacker_battle_unit_idx].ammo;
                                      /* 131:—  160:—  com1:0x99405..0x9941A */
        }
#endif

        if (Can_Attack_Again != 1)    /* 131:0x9941E  160:0x9941E  com1:0x9941E */
            return;
        BU_ProcessAttack(attacker_battle_unit_idx,
                         (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures,
                         defender_battle_unit_idx, am_Ranged, damage_types,
                         BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x9944B  160:0x9944B  com1:0x9944B */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x99455..0x99469  160:0x99455..0x99469
                                         com1:0x99455..0x99469 */
        return;
    }

    if ((int8_t)_battle_units[attacker_battle_unit_idx].ranged_type >= RAT_THROWN) {
                                      /* 131:0x99499  160:0x99499  com1:0x99499 */
        BU_ProcessAttack(attacker_battle_unit_idx,
                         (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures,
                         defender_battle_unit_idx, am_ThrownOrBreath, damage_types,
                         BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x994CA  160:0x994CA  com1:0x994CA */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x994D4..0x994E8  160:0x994D4..0x994E8
                                         com1:0x994D4..0x994E8 */

        if ((_battle_units[attacker_battle_unit_idx].Combat_Effects & BUE_HASTE)
            && (int8_t)_battle_units[attacker_battle_unit_idx].ranged_type
                < RAT_STONING_GAZE) { /* 131:0x994FD..0x99517  160:0x994FD..0x99517
                                         com1:0x994FD..0x99517 */
            BU_ProcessAttack(attacker_battle_unit_idx,
                             (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures,
                             defender_battle_unit_idx, am_ThrownOrBreath, damage_types,
                             BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x99540  160:0x99540  com1:0x99540 */
            for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
                 ++itr_damage_types)
                defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x9954A..0x9955E  160:0x9954A..0x9955E
                                         com1:0x9954A..0x9955E */
        }
    }

    if (!(_battle_units[defender_battle_unit_idx].Combat_Effects & BUE_BLACK_SLEEP)
        && (int8_t)_battle_units[defender_battle_unit_idx].ranged_type
            >= RAT_STONING_GAZE) {   /* 131:0x99574..0x99592  160:0x99574..0x99592
                                         com1:0x99574..0x99592 */
        Target_Damage_Sum = 0;        /* 131:0x99597  160:0x99597  com1:0x99597 */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            Target_Damage_Sum += defender_damage_types[itr_damage_types];
                                      /* 131:0x995A0..0x995AB  160:0x995A0..0x995AB
                                         com1:0x995A0..0x995AB */
        Target_Damage_Sum +=
            (int8_t)_battle_units[defender_battle_unit_idx].front_figure_damage;
                                      /* 131:0x995B4..0x995C7  160:0x995B4..0x995C7
                                         com1:0x995B4..0x995C7 */
        if (Target_Damage_Sum > 0)
            Figs = (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures
                 - Target_Damage_Sum
                    / (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 131:0x995CA..0x99604  160:0x995CA..0x99604
                                         com1:0x995CA..0x99604 */
        else
            Figs = (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures;
                                      /* 131:0x99607..0x9961A  160:0x99607..0x9961A
                                         com1:0x99607..0x9961A */

        BU_ProcessAttack(defender_battle_unit_idx, Figs, attacker_battle_unit_idx,
                         am_ThrownOrBreath, damage_types, BU_PA_COUNTERATTACK, SpFx);
                                      /* 131:0x99635  160:0x99635  com1:0x99635 */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types) {
            attacker_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x9963F..0x99653  160:0x9963F..0x99653
                                         com1:0x9963F..0x99653 */
            Source_Unit_Damage += damage_types[itr_damage_types];
                                      /* 131:0x99655..0x99660  160:0x99655..0x99660
                                         com1:0x99655..0x99660 */
        }
    }

    if (SpFx != 0)                  /* 131:0x99669  160:0x99669  com1:0x99669 */
        overlay_03E0_0043(attacker_battle_unit_idx);
                                      /* 131:0x99670  160:0x99670  com1:0x99670 */

#if BUILD == COM1
    first_strike_taken = 0;           /* 131:—  160:—  com1:0x99676 */
#endif
    if ((int8_t)_battle_units[attacker_battle_unit_idx].status != BUS_ACTIVE)
                                      /* 131:0x99683  160:0x99683  com1:0x99687 */
        return;

    if ((_battle_units[attacker_battle_unit_idx].attack_attributes & ATT_FIRST_STRIKE)
                                      /* 131:0x9969A  160:0x9969A  com1:0x99691 */
#if BUILD == COM1
        && (int8_t)((int8_t)_battle_units[defender_battle_unit_idx].hits
                    - (int8_t)_battle_units[defender_battle_unit_idx].front_figure_damage)
            < COM1_FIRST_STRIKE_HP_CEILING
                                      /* 131:—  160:—  com1:0x9969C..0x996B2 */
#endif
        && !(_battle_units[defender_battle_unit_idx].Abilities
             & UA_NEGATE_FIRST_STRIKE)) {
                                      /* 131:0x996B3  160:0x996B3  com1:0x996B4 */
#if BUILD == COM1
        ++first_strike_taken;         /* 131:—  160:—  com1:0x996BC */
#endif
        if (SpFx == ST_TRUE) {
#if BUILD == MOM131
            Feared_Figures = BU_CauseFear(attacker_battle_unit_idx,
                                           defender_battle_unit_idx);
                                      /* 131:0x996CA  160:—  com1:— */
#else
            Feared_Figures = BU_CauseFear(defender_battle_unit_idx,
                                           attacker_battle_unit_idx);
                                      /* 131:—  160:0x996CA  com1:0x996CA */
#endif
        }
#if BUILD == MOM131
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            Feared_Figures += attacker_damage_types[itr_damage_types]
                            / (int8_t)_battle_units[attacker_battle_unit_idx].hits;
                                      /* 131:0x996D2..0x996FF  160:—  com1:— */
#else
        /* The entry jump and back edge are both NOPed, so this body runs once. */
        Feared_Figures +=
            (Source_Unit_Damage
             + (int8_t)_battle_units[attacker_battle_unit_idx].front_figure_damage)
            / (int8_t)_battle_units[attacker_battle_unit_idx].hits;
                                      /* 131:—  160:0x996D2..0x99700
                                         com1:0x996D2..0x99700 */
#endif
        BU_ProcessAttack(attacker_battle_unit_idx,
                         (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures
                            - Feared_Figures,
                         defender_battle_unit_idx, am_Melee, damage_types,
                         BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x9972A  160:0x9972A  com1:0x9972A */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x99734..0x99748  160:0x99734..0x99748
                                         com1:0x99734..0x99748 */
    }

    if (!(_battle_units[defender_battle_unit_idx].Combat_Effects & BUE_BLACK_SLEEP)) {
                                      /* 131:0x9975E  160:0x9975E  com1:0x9975E */
        Target_Damage_Sum = 0;        /* 131:0x99769  160:0x99769  com1:0x99769 */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            Target_Damage_Sum += defender_damage_types[itr_damage_types];
                                      /* 131:0x99772..0x9977D  160:0x99772..0x9977D
                                         com1:0x99772..0x9977D */
        Target_Damage_Sum +=
            (int8_t)_battle_units[defender_battle_unit_idx].front_figure_damage;
                                      /* 131:0x99786..0x99799  160:0x99786..0x99799
                                         com1:0x99786..0x99799 */
        if (Target_Damage_Sum > 0)
            Figs = (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures
                 - Target_Damage_Sum
                    / (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 131:0x9979C..0x997D4  160:0x9979C..0x997D4
                                         com1:0x9979C..0x997D4 */
        else
            Figs = (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures;
                                      /* 131:0x997D9..0x997EC  160:0x997D9..0x997EC
                                         com1:0x997D9..0x997EC */

        if (SpFx == ST_TRUE)
            Figs -= BU_CauseFear(attacker_battle_unit_idx, defender_battle_unit_idx);
                                      /* 131:0x997FB  160:0x997FB  com1:0x997FB */
        if (Figs > 0) {               /* 131:0x99803  160:0x99803  com1:0x99803 */
            BU_ProcessAttack(defender_battle_unit_idx, Figs, attacker_battle_unit_idx,
                             am_Melee, damage_types, BU_PA_COUNTERATTACK, SpFx);
                                      /* 131:0x99823  160:0x99823  com1:0x99823 */
            for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
                 ++itr_damage_types)
                attacker_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x9982D..0x99841  160:0x9982D..0x99841
                                         com1:0x9982D..0x99841 */
#if BUILD == MOM131 || BUILD == CP160
            if (_battle_units[defender_battle_unit_idx].Combat_Effects & BUE_HASTE) {
                                      /* 131:0x99857  160:0x99857  com1:— */
                BU_ProcessAttack(defender_battle_unit_idx, Figs,
                                 attacker_battle_unit_idx, am_Melee, damage_types,
                                 BU_PA_COUNTERATTACK, SpFx);
                                      /* 131:0x99876  160:0x99876  com1:— */
                for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
                     ++itr_damage_types)
                    attacker_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x99880..0x99894  160:0x99880..0x99894
                                         com1:— */
            }
#else
            goto com1_ordinary_dispatch; /* 131:—  160:—  com1:0x99849 ->0x998C1 */
#endif
        }
    }

#if BUILD == MOM131 || BUILD == CP160
    if ((_battle_units[attacker_battle_unit_idx].attack_attributes & ATT_FIRST_STRIKE)
        && !(_battle_units[defender_battle_unit_idx].Abilities
             & UA_NEGATE_FIRST_STRIKE))
        goto attacker_haste_repeat;   /* 131:0x998A9..0x998C7  160:0x998A9..0x998C7
                                         com1:— */
#else
com1_ordinary_dispatch:
    if (first_strike_taken != 0)
        goto attacker_haste_repeat;   /* 131:—  160:—  com1:0x998C1..0x998C7 */
#endif

    if (SpFx == ST_TRUE) {
#if BUILD == MOM131
        Feared_Figures = BU_CauseFear(attacker_battle_unit_idx,
                                       defender_battle_unit_idx);
                                      /* 131:0x998D6  160:—  com1:— */
#else
        Feared_Figures = BU_CauseFear(defender_battle_unit_idx,
                                       attacker_battle_unit_idx);
                                      /* 131:—  160:0x998D6  com1:0x998D6 */
#endif
    }
    Source_Unit_Damage +=
        (int8_t)_battle_units[attacker_battle_unit_idx].front_figure_damage;
                                      /* 131:0x998DE..0x998F0  160:0x998DE..0x998F0
                                         com1:0x998DE..0x998F0 */
    Feared_Figures += Source_Unit_Damage
                    / (int8_t)_battle_units[attacker_battle_unit_idx].hits;
                                      /* 131:0x998F3..0x9990D  160:0x998F3..0x9990D
                                         com1:0x998F3..0x9990D */
    BU_ProcessAttack(attacker_battle_unit_idx,
                     (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures
                        - Feared_Figures,
                     defender_battle_unit_idx, am_Melee, damage_types,
                     BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x99939  160:0x99939  com1:0x99939 */
    for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
         ++itr_damage_types)
        defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x99943..0x99957  160:0x99943..0x99957
                                         com1:0x99943..0x99957 */

attacker_haste_repeat:
    if (_battle_units[attacker_battle_unit_idx].Combat_Effects & BUE_HASTE) {
                                      /* 131:0x9996C  160:0x9996C  com1:0x9996C */
        BU_ProcessAttack(attacker_battle_unit_idx,
                         (int8_t)_battle_units[attacker_battle_unit_idx].Cur_Figures
                            - Feared_Figures,
                         defender_battle_unit_idx, am_Melee, damage_types,
                         BU_PA_OWN_ATTACK, SpFx);
                                      /* 131:0x9999D  160:0x9999D  com1:0x9999D */
        for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES;
             ++itr_damage_types)
            defender_damage_types[itr_damage_types] += damage_types[itr_damage_types];
                                      /* 131:0x999A7..0x999BB  160:0x999A7..0x999BB
                                         com1:0x999A7..0x999BB */
    }
}                                     /* 131:0x999C3..0x999C8  160:0x999C3..0x999C8
                                         com1:0x999C3..0x999C8 */

void __far BU_ProcessAttack(int16_t attacker_battle_unit_idx,
                            int16_t Figs,
                            int16_t defender_battle_unit_idx,
                            int16_t attack_mode,
                            int16_t damage_types[NUM_DAMAGE_TYPES],
                            int16_t counterattack_flag,
                            int16_t SpFx)
{
    int16_t  itr_damage_types;
    int16_t  attack_damage;
    int16_t  distance_penalty;
    int16_t  attack_ranged_type;
    int16_t  attack_magic_realm;
    int16_t  attack_strength;
    int16_t  attack_flags;
    int16_t  channel_attack_flags;
    int16_t  attack_immunities;
    int16_t  to_hit;
    int16_t  unused_1c;
    int16_t  defender_to_block;
    int16_t  defender_front_damage;
    int16_t  i;
    int16_t  blur_i;
    int16_t  defense_special;
    int16_t  save_modifier;
    int16_t  target_damage;
    int16_t  local_damage[NUM_DAMAGE_TYPES];
    uint32_t defender_all_enchantments;
#if BUILD == COM1
    int16_t  com1_attack_marker;
    int16_t  com1_attack_floor;
    int16_t  attacker_bu_offset;         /* bp-0x32; `89 5E CE` stores BX only, so this is a
                                          * 16-bit offset, not a far pointer — four bytes here
                                          * would overlap com1_attack_marker at bp-0x30 */
    struct s_BATTLE_UNIT __far *attacker_bu;  /* not a frame slot; BX paired with the ES that
                                               * the preceding statement happened to load */
#endif

    defender_front_damage =
        (int8_t)_battle_units[defender_battle_unit_idx].front_figure_damage;
                                      /* 131:0x999E4  160:=  com1:= */

#if BUILD == COM1
    com1_attack_marker = 0;           /* 131:—  160:—  com1:0x999EC */
                                      /* com1 0x999F1..0x999F4: four NOPs; com1 also drops the
                                       * battle-unit address recompute and reuses BX here */
#endif

    /* One 32-bit set: the persistent unit record's enchantments, the battle unit's own
     * enchantments, and its item enchantments. The low word is `[bp-0x2C]` and the high word
     * `[bp-0x2A]`; R6.2c's Invisibility test reads low while Invulnerability reads high. */
    defender_all_enchantments =
          _UNITS[_battle_units[defender_battle_unit_idx].unit_idx].enchantments
                                      /* 131:0x999F9..0x99A0B  160:=  com1:0x999F5..0x99A07 */
        | _battle_units[defender_battle_unit_idx].enchantments
                                      /* 131:0x99A1F, 0x99A24  160:=  com1:0x99A1B, 0x99A20 */
        | _battle_units[defender_battle_unit_idx].item_enchantments;
                                      /* 131:0x99A39, 0x99A3D  160:=  com1:0x99A35, 0x99A39 */
                                      /* stores: 131:0x99A41, 0x99A44  com1:0x99A3D, 0x99A40 */

    unused_1c       = 0;              /* 131:0x99A47  160:=  com1:0x99A43 */
    attack_strength = 0;              /* 131:0x99A4C  160:=  com1:0x99A48 */
    attack_damage   = 0;              /* 131:0x99A51  160:=  com1:0x99A4D */

#if BUILD == COM1
    attacker_bu_offset = FP_OFF(&_battle_units[attacker_battle_unit_idx]);
                                      /* `89 5E CE`; 131:—  160:—  com1:0x99A5F (0x99A62 NOP) */
#endif
    to_hit = (int8_t)_battle_units[attacker_battle_unit_idx].tohit;
                                      /* 131:0x99A63  160:=  com1:= */

    for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES; ++itr_damage_types)
                                      /* 131:0x99A6B..0x99A87  160:=  com1:= */
        damage_types[itr_damage_types] = 0;
                                      /* 131:0x99A7C  160:=  com1:= */

    if (Figs <= 0)                    /* 131:0x99A89  160:=  com1:= */
        return;                       /* 131:0x99A8F..0x99A91  160:=  com1:= */
                                      /* `33 C0` at 0x99A8F clears AX on this path alone. The
                                       * routine yields no value: the other two early exits
                                       * (`E9 4F 08` at 0x99D2F, `E9 AA 06` at 0x99ED4) and the
                                       * main fall-through at 0x9A57C all reach the epilogue with
                                       * AX holding a leftover — at 0x9A576 it is the loop
                                       * counter `[bp-2]`. No caller reads it; R6.2a's sites
                                       * clean up with `83 C4 0E` and overwrite SI immediately
                                       * (0x9932C). The AX clear is left unexplained here. */

    attack_flags = _battle_units[attacker_battle_unit_idx].attack_attributes;
                                      /* 131:0x99AA1..0x99AA5  160:=  com1:= */
    defender_to_block = (int8_t)_battle_units[defender_battle_unit_idx].toblock;
                                      /* 131:0x99AB5..0x99ABA  160:=  com1:= */
    attack_immunities = Battle_Unit_Attack_Immunities(attacker_battle_unit_idx, attack_mode);
                                      /* 131:0x99AC2, store 0x99AC7  160:=  com1:= */

    if (attack_mode > am_Melee) {     /* 131:0x99ACA..0x99AD0  160:=  com1:= */

        /* ---- ranged / thrown / breath channel ---- */
        attack_flags |= _battle_units[attacker_battle_unit_idx].ranged_attack_attributes;
                                      /* 131:0x99AE3, store 0x99AE7  160:=  com1:= */
        channel_attack_flags =
            _battle_units[attacker_battle_unit_idx].ranged_attack_attributes;
                                      /* 131:0x99AF7, store 0x99AFB  160:=  com1:0x99AEA, 0x99AEE */
        attack_strength = (int8_t)_battle_units[attacker_battle_unit_idx].ranged;
                                      /* 131:0x99B0B, store 0x99B10  160:=  com1:0x99AF1, 0x99AF6 */
        attack_magic_realm =
            Battle_Unit_Attack_Magic_Realm((int8_t)_battle_units[attacker_battle_unit_idx].ranged_type,
                      attacker_battle_unit_idx);
                                      /* 131:0x99B21, call 0x99B29, store 0x99B2E
                                         160:=  com1:0x99AFA, call 0x99B01, store 0x99B06 */
        attack_ranged_type = (int8_t)_battle_units[attacker_battle_unit_idx].ranged_type;
                                      /* 131:0x99B3E, store 0x99B43  160:=  com1:0x99B16, 0x99B1B */

        if (attack_ranged_type == RAT_LIGHTNING_BREATH)
                                      /* 131:0x99B46  160:=  com1:0x99B1E */
            attack_flags |= ATT_ARMOR_PIERCING;
                                      /* 131:0x99B4C..0x99B52  160:=  com1:0x99B24..0x99B2A */

        if (attack_ranged_type == RAT_MULTIPLE_GAZE) {
                                      /* 131:0x99B55  160:=  com1:0x99B2D */
            attack_flags |= ATT_DOOM_DAMAGE;
                                      /* 131:0x99B5B..0x99B61  160:=  com1:0x99B33 */
#if BUILD == COM1
            com1_attack_marker |= 1;  /* 131:—  160:—  com1:0x99B37 (0x99B3B NOP) */
#endif
        }

#if BUILD == MOM131
        /* 1.31 keeps the ranged To Hit bonus inside the mode-2 gate. */
        if (attack_mode == am_Ranged) {
                                      /* 131:0x99B64..0x99B68  160:—  com1:— */
            if (Battle_Unit_Has_Ranged_Attack(attacker_battle_unit_idx) == 0) {
                                      /* 131:0x99B6D, test 0x99B71..0x99B73  160:—  com1:— */
                attack_strength = 0;  /* 131:0x99BE1  160:—  com1:— */
            } else {
                to_hit += (int8_t)_battle_units[attacker_battle_unit_idx].ranged_tohit;
                                      /* 131:0x99B82..0x99B87  160:—  com1:— */
#else
        /* CP 1.60 and CoM 1 hoist the bonus out of the gate, so it applies on mode 1 as well. */
        to_hit += (int8_t)_battle_units[attacker_battle_unit_idx].ranged_tohit;
                                      /* 131:—  160:0x99B71..0x99B76  com1:0x99B49..0x99B4E */
                                      /* com1 0x99B51..0x99B63: nineteen NOPs */
#if BUILD == COM1
        if ((int8_t)_UNITS[_battle_units[attacker_battle_unit_idx].unit_idx].Hero_Slot
                > HERO_SLOT_NONE)     /* 131:—  160:—  com1:0x99B64..0x99B77 */
            goto ranged_channel_done; /* skips the mode gate and the distance block outright */
#endif
        if (attack_mode == am_Ranged) {
                                      /* 131:—  160:0x99B79..0x99B7D  com1:0x99B79..0x99B7D */
            if (Battle_Unit_Has_Ranged_Attack(attacker_battle_unit_idx) == 0) {
                                      /* 131:—  160:0x99B82, test 0x99B86..0x99B88
                                         com1:0x99B82, test 0x99B86..0x99B88 */
                attack_strength = 0;  /* 131:—  160:0x99BE1  com1:0x99BE1 */
            } else {
#endif
                if (RAT_CLASS((int8_t)_battle_units[attacker_battle_unit_idx].ranged_type)
                        != RAT_CLASS_MAGIC) {
                                      /* 131:0x99B97..0x99BA5  160:=  com1:= */
#if BUILD == COM1
                    distance_penalty =
                        Range_To_Battle_Unit(attacker_battle_unit_idx, defender_battle_unit_idx)
                        / COM1_RANGED_DISTANCE_DIVISOR;
                                      /* 131:—  160:—  com1:0x99BAB, 0x99BB0..0x99BB6 */
#else
                    distance_penalty =
                        Range_To_Battle_Unit(attacker_battle_unit_idx, defender_battle_unit_idx)
                        / MOM_RANGED_DISTANCE_DIVISOR;
                                      /* 131:0x99BAB, 0x99BB0..0x99BB6  160:=  com1:— */
#endif
                    if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_LONG_RANGE)
                        && distance_penalty > 0)
                                      /* 131:0x99BC6..0x99BD2  160:=  com1:= */
                        distance_penalty = LONG_RANGE_DISTANCE_PENALTY;
                                      /* 131:0x99BD4  160:=  com1:= */
                    to_hit -= distance_penalty;
                                      /* 131:0x99BD9..0x99BDC  160:=  com1:= */
                }
            }
        }
#if BUILD == COM1
ranged_channel_done:
#endif
        ;                             /* joins at 131:0x99BE6  160:=  com1:= */

    } else {

        /* ---- melee channel ---- */
        attack_flags |= _battle_units[attacker_battle_unit_idx].melee_attack_attributes;
                                      /* 131:0x99BF9, store 0x99BFD  160:=  com1:= */
#if BUILD == COM1
        com1_frame_helper_9AC1B();    /* 131:—  160:—  com1:0x99C00; preserves ES:BX */
#endif
        channel_attack_flags =
            _battle_units[attacker_battle_unit_idx].melee_attack_attributes;
                                      /* 131:0x99C0D, store 0x99C11  160:=  com1:0x99C03, 0x99C07 */

#if BUILD == MOM131
        to_hit += (int8_t)_battle_units[attacker_battle_unit_idx].melee_tohit
                - (int8_t)_battle_units[defender_battle_unit_idx].toblock;
                                      /* 131:0x99C21..0x99C41  160:—  com1:— */
#elif BUILD == CP160
        /* 0x99C3A..0x99C3B is `90 90` where 1.31 has `2B D0`; the defender's To Block is still
         * loaded at 0x99C34 and then discarded. */
        to_hit += (int8_t)_battle_units[attacker_battle_unit_idx].melee_tohit;
                                      /* 131:—  160:0x99C21..0x99C41  com1:— */
#else
        to_hit += (int8_t)_battle_units[attacker_battle_unit_idx].melee_tohit;
                                      /* 131:—  160:—  com1:0x99C0A..0x99C11 */
#endif

        attack_strength = (int8_t)_battle_units[attacker_battle_unit_idx].melee;
                                      /* 131:0x99C51, store 0x99C55  160:=  com1:0x99C21, 0x99C25 */

#if BUILD == COM1
        if (((_battle_units[attacker_battle_unit_idx].enchantments & UE_BERSERK)
                                      /* 131:—  160:—  com1:0x99C28..0x99C2D */
             || (_UNITS[_battle_units[attacker_battle_unit_idx].unit_idx].enchantments
                 & UE_BERSERK))       /* 131:—  160:—  com1:0x99C2F..0x99C41 */
            && (int8_t)_battle_units[defender_battle_unit_idx].race < RACE_FIRST_FANTASTIC)
                                      /* 131:—  160:—  com1:0x99C43..0x99C53 */
            attack_strength <<= 1;    /* 131:—  160:—  com1:0x99C55 */
#endif

        attack_magic_realm = Battle_Unit_Attack_Magic_Realm(RAT_NONE, attacker_battle_unit_idx);
                                      /* 131:0x99C5E, store 0x99C63  160:=  com1:= */
        attack_ranged_type = 0;       /* 131:0x99C66  160:=  com1:= */
    }

    for (itr_damage_types = 0; itr_damage_types < NUM_DAMAGE_TYPES; ++itr_damage_types)
                                      /* 131:0x99C6B..0x99C87  160:=  com1:= */
        local_damage[itr_damage_types] = 0;
                                      /* 131:0x99C7C  160:=  com1:= */

#if BUILD == MOM131 || BUILD == CP160
    if (((defender_all_enchantments & UE_INVISIBILITY)
                                      /* raw mask 0x00008000; 131:0x99C89..0x99C98  160:= */
         || (_battle_units[defender_battle_unit_idx].Abilities & UA_INVISIBILITY))
                                      /* 131:0x99CA7..0x99CAD  160:= */
        && !(_battle_units[attacker_battle_unit_idx].Attribs_1 & USA_IMMUNITY_ILLUSION))
                                      /* 131:0x99CBC..0x99CC2  160:= */
        --to_hit;                     /* 131:0x99CC4  160:= */
#else
    /* com1 0x99C89..0x99CC6: sixty-two NOPs. The Invisibility To Hit penalty, its two source
     * tests and the Illusion-immunity exemption are all replaced by padding. The merged
     * 32-bit `defender_all_enchantments` has no reader in the R6.2b extent; R6.2c later reads
     * its low word for Invisibility and high word for Invulnerability. */
#endif

    if (counterattack_flag == BU_PA_COUNTERATTACK)
                                      /* 131:0x99CC7..0x99CCB  160:=  com1:= */
        to_hit -= (int8_t)_battle_units[attacker_battle_unit_idx].Suppression / 2;
                                      /* signed /2 idiom; 131:0x99CDA..0x99CE4  160:=  com1:= */

    /* A non-flying attacker cannot reach a flying defender in melee on its own attack unless it
     * has a thrown-or-better attack type. */
    if ((_battle_units[defender_battle_unit_idx].Move_Flags & MV_FLYING)
                                      /* 131:0x99CF4..0x99CF9  160:=  com1:= */
        && attack_mode == am_Melee    /* 131:0x99CFB..0x99CFF  160:=  com1:= */
        && !(_battle_units[attacker_battle_unit_idx].Move_Flags & MV_FLYING)
                                      /* 131:0x99D0E..0x99D13  160:=  com1:= */
        && counterattack_flag != BU_PA_COUNTERATTACK
                                      /* 131:0x99D15..0x99D19  160:=  com1:= */
        && (int8_t)_battle_units[attacker_battle_unit_idx].ranged_type < RAT_THROWN)
                                      /* 131:0x99D28..0x99D2D  160:0x99D1B..0x99D20
                                         com1:0x99D1B..0x99D20 */
        return;                       /* 131:0x99D2F  160:0x99D22  com1:0x99D22 */
                                      /* 1.31 recomputes the attacker's record address at
                                       * 0x99D1B..0x99D27; CP and CoM reuse BX from 0x99D01 */

    if (!(_battle_units[defender_battle_unit_idx].Attribs_1 & USA_IMMUNITY_MAGIC)) {
                                      /* 131:0x99D3F..0x99D47  160:0x99D32..0x99D3A
                                         com1:0x99D32..0x99D3A */

#if BUILD == MOM131
        if (_battle_units[attacker_battle_unit_idx].Attribs_2 & USA2_IMMOLATION) {
                                      /* 131:0x99D57..0x99D5C  160:—  com1:— */
            overlay_0388_0039(SPELL_FIREBALL, defender_battle_unit_idx, local_damage,
                              MOM_IMMOLATION_STRENGTH);
                                      /* 131:0x99D5E..0x99D70  160:—  com1:— */
        }
#elif BUILD == CP160
        if (attack_mode <= am_Melee)  /* 131:—  160:0x99D3D..0x99D41  com1:— */
        {                             /* 160:0x99D43..0x99D49: seven NOPs */
            if (_battle_units[attacker_battle_unit_idx].Attribs_2 & USA2_IMMOLATION) {
                                      /* 131:—  160:0x99D57..0x99D5C  com1:— */
                overlay_0388_0039(SPELL_FIREBALL, defender_battle_unit_idx, local_damage,
                                  MOM_IMMOLATION_STRENGTH);
                                      /* 131:—  160:0x99D5E..0x99D70  com1:— */
            }
        }
#else
        /* CoM 1 reaches the attacker's record through the cached offset from 0x99A5F rather than
         * recomputing it. ES is **not** reloaded here: it still carries the battle-unit segment
         * that the Magic Immunity test's `les bx,[0x922A]` at 0x99D2C left in place. Every field
         * read in this block — 0x99D49, 0x99D58 and 0x99D5F — uses that BX. */
        attacker_bu = MK_FP(FP_SEG(_battle_units), attacker_bu_offset);
                                      /* `8B 5E CE`; 131:—  160:—  com1:0x99D3D */
                                      /* `8D 4E D8` at com1:0x99D40 loads CX with &local_damage,
                                       * which both argument pushes below reuse */
        if (attack_mode <= am_Melee) {
                                      /* 131:—  160:—  com1:0x99D43..0x99D47 */
            if (attacker_bu->Attribs_2 & USA2_IMMOLATION)
                                      /* `26 F6 47 1A 08`; 131:—  160:—  com1:0x99D49..0x99D4E */
                overlay_0388_0039(SPELL_FIREBALL, defender_battle_unit_idx, local_damage,
                                  COM1_IMMOLATION_STRENGTH);
                                      /* args pushed 131:—  160:—  com1:0x99D50..0x99D56,
                                         call com1:0x99D6B, cleanup com1:0x99D70 */
        } else {
            (void)(attacker_bu->attack_attributes & ATT_SUPERNATURAL);
                                      /* `26 F6 47 1F 20` on the high byte of +0x1E;
                                         test com1:0x99D58; the result is discarded because
                                         0x99D5D is an unconditional jmp to 0x99D73 */
            if (0) {                  /* unreachable: nothing branches to 0x99D5F */
                overlay_0388_0039(COM1_DEAD_SPELL_07, defender_battle_unit_idx, local_damage,
                                  (int8_t)attacker_bu->Cur_Figures + 2);
                                      /* `26 8A 47 0D` then `04 02`; the spell id is raw 7, not
                                         SPELL_FIREBALL, and the strength override is the
                                         attacker's own figure count plus two
                                         131:—  160:—  com1:0x99D5F..0x99D69 */
            }
        }
#endif

        /* ---- stoning gaze kill rolls ---- */
        if (attack_ranged_type == RAT_STONING_GAZE
            || attack_ranged_type == RAT_MULTIPLE_GAZE) {
                                      /* 131:0x99D73..0x99D7F  160:=  com1:= */
            if (!(_battle_units[defender_battle_unit_idx].Attribs_1 & USA_IMMUNITY_STONING)) {
                                      /* 131:0x99D8F..0x99D95  160:=  com1:= */
                for (itr_damage_types = 0;
                     itr_damage_types
                        < (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures;
                     ++itr_damage_types) {
                                      /* 131:0x99D97..0x99D9C, 0x99DF7, 0x99E07..0x99E0F
                                         160:=  com1:= */
                    if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                  -abs((int8_t)_battle_units[attacker_battle_unit_idx]
                                           .Spec_Att_Attrib),
                                  sbr_Nature) > 0)
                                      /* 131:0x99D9E..0x99DE0  160:=  com1:= */
                        local_damage[2] +=
                            (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 131:0x99DEF..0x99DF4  160:=  com1:= */
                }
            }
        }

        /* ---- death gaze kill rolls ---- */
        if (attack_ranged_type == RAT_MULTIPLE_GAZE
            || attack_ranged_type == RAT_DEATH_GAZE) {
                                      /* 131:0x99E11..0x99E1D  160:=  com1:= */
            if (!(_battle_units[defender_battle_unit_idx].Attribs_1 & USA_IMMUNITY_DEATH)) {
                                      /* 131:0x99E2D..0x99E33  160:=  com1:= */
                for (itr_damage_types = 0;
                     itr_damage_types
                        < (int8_t)_battle_units[defender_battle_unit_idx].Cur_Figures;
                     ++itr_damage_types) {
                                      /* 131:0x99E35..0x99E3A, 0x99E96, 0x99EA6..0x99EAE
                                         160:=  com1:= */
                    if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                  -abs((int8_t)_battle_units[attacker_battle_unit_idx]
                                           .Spec_Att_Attrib),
                                  sbr_Death) > 0)
                                      /* 131:0x99E3C..0x99E7F  160:=  com1:= */
                        local_damage[0] +=
                            (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 131:0x99E8E..0x99E93  160:=  com1:= */
                }
            }
        }
    }

    if (_battle_units[defender_battle_unit_idx].Combat_Effects & BUE_BLACK_SLEEP) {
                                      /* 131:0x99EBD..0x99EC3  160:=  com1:= */
        attack_flags |= ATT_DOOM_DAMAGE;
                                      /* 131:0x99EC5..0x99ECB  160:=  com1:0x99EC5 */
#if BUILD == COM1
        com1_attack_marker |= 1;      /* 131:—  160:—  com1:0x99EC9 (0x99ECD NOP) */
#endif
    }

#if BUILD == MOM131
    if (attack_strength <= 0)         /* 131:0x99ECE..0x99ED2  160:—  com1:— */
        return;                       /* 131:0x99ED4  160:—  com1:— */
#else
    (void)(attack_strength > 0);      /* the cmp survives at 0x99ECE; 0x99ED2 is `EB 03`,
                                       * an unconditional jmp over the abort
                                       * 131:—  160:0x99ECE..0x99ED2  com1:0x99ECE..0x99ED2 */
    if (0)
        return;                       /* unreachable: no branch in [0x999C9,0x9A600) targets
                                       * 0x99ED4  131:—  160:0x99ED4  com1:0x99ED4 */
#endif

    /* ---- R6.2c begins at 0x99ED7 ---- */
defense_special = Battle_Unit_Defense_Special(
    defender_battle_unit_idx, attack_ranged_type, attack_immunities,
    attack_flags, attack_magic_realm);
/* pushes 131:0x99ED7..0x99EE4 160:= com1:=;
 * E8 9E 06 call 131:0x99EE6 160:= com1:= -> 0x9A587, the defence-special helper;
 * store 131:0x99EEC 160:= com1:= */

if (attack_flags & ATT_ELDRITCH_WEAPON) {
    /* F7 46 EC 00 40; JE ->0x99EF9, which begins the city checks:
       131:0x99EEF 160:= com1:= */
    --defender_to_block;              /* FF 4E E2; 131:0x99EF6 160:= com1:= */
}

if (overlay_03E0_0052(defender_battle_unit_idx) == 1
                                      /* lcall 03E0:0052 at 131:0x99EFA 160:= com1:=;
                                         JNE ->0x99F52, outer-loop init, at 131:0x99F03 160:= com1:= */
    && overlay_03E0_0052(attacker_battle_unit_idx) == 0
                                      /* lcall 03E0:0052 at 131:0x99F06 160:= com1:=;
                                         JNE ->0x99F52 at 131:0x99F0E 160:= com1:= */
#if BUILD == MOM131
    && battlefield->walled != 0) {    /* 83 BF 56 15 00; JE ->0x99F52 at 131:0x99F14..0x99F1A */
    if (overlay_03E0_0057(
            _battle_units[defender_battle_unit_idx].cgx,
            _battle_units[defender_battle_unit_idx].cgy) != 0) {
                                      /* coordinate pushes 131:0x99F1C..0x99F3A;
                                         lcall 03E0:0057 at 131:0x99F3E;
                                         JE ->0x99F4F, the +1 arm, at 131:0x99F47 */
        defense_special += 3;         /* 83 46 F4 03; 131:0x99F49 */
    } else {
        ++defense_special;            /* FF 46 F4; 131:0x99F4F */
    }
#else
    && battlefield->walled == 1) {    /* 83 BF 56 15 01; JNE ->0x99F52:
                                         131:- 160:0x99F14..0x99F1A com1:= */
    int16_t wall_x = _battle_units[defender_battle_unit_idx].cgx;
    int16_t wall_y = _battle_units[defender_battle_unit_idx].cgy;
                                      /* MOV AX,[+0x46], MOV DX,[+0x44], JMP ->0x99F7C:
                                         131:- 160:0x99F1C..0x99F31 com1:= */
    if (((wall_x == WALL_PATCH_X_FIRST || wall_x == WALL_PATCH_X_LAST)
         && (wall_y == WALL_PATCH_Y_FIRST || wall_y == WALL_PATCH_Y_LAST))
                                      /* conditional island 131:- 160:0x99F7C..0x99F8E com1:=;
                                         matching coordinates jump to the +3 arm at 0x99F48 */
        || overlay_03E0_0057(wall_x, wall_y) != 0) {
                                      /* pushes/NOPs 131:- 160:0x99F33..0x99F3C com1:=;
                                         lcall 03E0:0057 at 131:- 160:0x99F3D com1:=;
                                         JE ->0x99F4E, the +1 arm, at 131:- 160:0x99F46 com1:= */
        defense_special += 3;         /* 83 46 F4 03; 131:- 160:0x99F48 com1:= */
    } else {
        defense_special += 1;         /* 83 46 F4 01; 131:- 160:0x99F4E com1:= */
    }
#endif
}

itr_damage_types = 0;                     /* C7 46 FE 00 00; 131:0x99F52 160:= com1:= */
goto test_figures;                   /* E9 1C 06 ->0x9A576, outer-loop test;
                                       131:0x99F57 160:= com1:= */

do {
    /* The defender Magic-Immunity gate skips all five touch blocks. */
    if (!(_battle_units[defender_battle_unit_idx].Attribs_1 & USA_IMMUNITY_MAGIC)) {
                                      /* test at 131:0x99F67 160:= com1:=;
                                         JE ->0x99F72, Dispel Evil gate, at 131:0x99F6D 160:= com1:=;
                                         JMP ->0x9A1E6, automatic/rolled damage, at 131:0x99F6F 160:= com1:= */

        if (attack_flags & ATT_DISPEL_EVIL) {
#if BUILD == MOM131 || BUILD == CP160
                                      /* test 131:0x99F72 160:= com1:-;
                                         131 JNE ->0x99F7C (race tests) at 0x99F77;
                                         160 JNE ->0x99F96 (race tests) at 0x99F77;
                                         the false arm JMP ->0x9A010 (Stoning Touch) at 0x99F79 */
            if ((int8_t)_battle_units[defender_battle_unit_idx].race == RACE_CHAOS
                || (int8_t)_battle_units[defender_battle_unit_idx].race == RACE_DEATH) {
                                      /* 131:0x99F7C,0x99F8E,0x99FA2 race tests;
                                         160 race tests 0x99F96..0x99FA2;
                                         final JNE ->0x9A010 at 0x99FA2 */
                save_modifier = -4;  /* C7 46 D2 FC FF; 131:0x99FA4 160:= com1:- */
                if (_UNITS[_battle_units[defender_battle_unit_idx].unit_idx].mutations
                    & 0x20) {
                                      /* recompute/read 131:0x99FA9..0x99FC9;
                                         160 NOPs 0x99FA9..0x99FB5 then read 0x99FB6..0x99FC9;
                                         JE ->0x99FCF, resistance arguments, at 0x99FC9 */
                    save_modifier -= 5; /* 83 6E D2 05; 131:0x99FCB 160:= */
                }
                if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                            save_modifier, sbr_LIFE) > 0) {
                                      /* copy helper 131:0x99FEB 160:=;
                                         resistance call 131:0x99FF1 160:=;
                                         JLE ->0x9A010 at 131:0x99FF9 160:= */
                    local_damage[2] +=
                        (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 01 46 DC; 131:0x9A00D 160:= com1:= */
                }
            }
#else
                                      /* ATT_DISPEL_EVIL test at com1:0x99F72;
                                         JNE ->0x99F96 (race tests) at com1:0x99F77;
                                         false JMP ->0x9A010 at com1:0x99F79 */
            if ((int8_t)_battle_units[defender_battle_unit_idx].race
                    >= RACE_FIRST_FANTASTIC
                || (int8_t)_battle_units[defender_battle_unit_idx].race == RACE_DEATH) {
                                      /* CMP race,0x0F / JGE ->0x99FA4 at com1:0x99F96..0x99F9B;
                                         the residual CMP race,0x14 / JNE ->0x9A010 at
                                         com1:0x99F9D..0x99FA2 is unreachable: this arm is
                                         reached only for signed race < 0x0F, so it cannot
                                         equal RACE_DEATH (0x14). It remains rendered because
                                         both instructions survive in the executable. */
                save_modifier = -3;  /* C7 46 D2 FD FF; com1:0x99FA4 */
                if (_UNITS[_battle_units[defender_battle_unit_idx].unit_idx].mutations
                    & 0x20) {
                                      /* test com1:0x99FB7; JE ->0x99FC2, Spell Lock test,
                                         at com1:0x99FBC */
                    save_modifier -= 3; /* 83 6E D2 03; com1:0x99FBE */
                }
                if (!(_UNITS[_battle_units[defender_battle_unit_idx].unit_idx].enchantments
                      & UE_SPELL_LOCK)) {
                                      /* F6 47 19 40; JNE ->0x9A010 at com1:0x99FC2..0x99FC7;
                                         com1:0x99FC9..0x99FCE are six NOPs */
                    if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                                save_modifier, sbr_LIFE) > 0) {
                                      /* copy helper com1:0x99FEB; resistance call com1:0x99FF1;
                                         JLE ->0x9A010 at com1:0x99FF9 */
                        local_damage[2] +=
                            (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* com1:0x9A00D */
                    }
                }
            }
#endif
        }

        if ((attack_flags & ATT_STONING_TOUCH)
                                      /* JE ->0x9A094, Death Touch, at 131:0x9A010..0x9A015 160:= com1:= */
            && !(_battle_units[defender_battle_unit_idx].Attribs_1
                 & USA_IMMUNITY_STONING)) {
                                      /* JNE ->0x9A094 at 131:0x9A024..0x9A02A 160:= com1:= */
            save_modifier = -abs((int8_t)_battle_units[attacker_battle_unit_idx]
                                     .Spec_Att_Attrib);
                                      /* abs lcall 0000:02C8 at 131:0x9A03F 160:= com1:=;
                                         NEG/store 131:0x9A045..0x9A047 160:= com1:= */
            if (channel_attack_flags & ATT_STONING_TOUCH) {
                                      /* JE ->0x9A054, resistance args, at
                                         131:0x9A04A..0x9A04F 160:= com1:= */
                --save_modifier;      /* FF 4E D2; 131:0x9A051 160:= com1:= */
            }
            if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                        save_modifier, sbr_NATURE) > 0) {
                                      /* copy helper 131:0x9A06F 160:= com1:=;
                                         resistance call 131:0x9A075 160:= com1:=;
                                         JLE ->0x9A094 at 131:0x9A07D 160:= com1:= */
                local_damage[2] +=
                    (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 131:0x9A091 160:= com1:= */
            }
        }

        if ((attack_flags & ATT_DEATH_TOUCH)
                                      /* JNE ->0x9A09E, body, or JMP ->0x9A11D, Life Steal:
                                         131:0x9A094..0x9A09B 160:= com1:= */
            && !(_battle_units[defender_battle_unit_idx].Attribs_1
                 & USA_IMMUNITY_DEATH)) {
                                      /* JNE ->0x9A11D at 131:0x9A0AB..0x9A0B1 160:= com1:= */
            save_modifier = -abs((int8_t)_battle_units[attacker_battle_unit_idx]
                                     .Spec_Att_Attrib);
                                      /* abs call/store 131:0x9A0C6..0x9A0CE 160:= com1:= */
            if (channel_attack_flags & ATT_DEATH_TOUCH) {
                                      /* JE ->0x9A0DC, resistance args, at 131:0x9A0D1..0x9A0D6 160:= com1:= */
                save_modifier -= 3;  /* 83 6E D2 03; 131:0x9A0D8 160:= com1:= */
            }
            if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                        save_modifier, sbr_DEATH) > 0) {
                                      /* copy helper 131:0x9A0F8 160:= com1:=;
                                         resistance call 131:0x9A0FE 160:= com1:=;
                                         JLE ->0x9A11D at 131:0x9A106 160:= com1:= */
                local_damage[0] +=
                    (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* 01 46 D8; 131:0x9A11A 160:= com1:= */
            }
        }

        if ((attack_flags & ATT_LIFE_STEAL)
                                      /* JE ->0x9A19E, Destruction, at 131:0x9A11D..0x9A122 160:= com1:= */
            && !(_battle_units[defender_battle_unit_idx].Attribs_1
                 & USA_IMMUNITY_DEATH)) {
                                      /* JNE ->0x9A19E at 131:0x9A131..0x9A137 160:= com1:= */
            save_modifier = -abs((int8_t)_battle_units[attacker_battle_unit_idx]
                                     .Spec_Att_Attrib);
                                      /* abs call/NEG at 131:0x9A14C..0x9A154 160:=;
                                         com1:0x9A14C..0x9A15B keeps AX live and stores no frame copy */
#if BUILD == COM1
            if (channel_attack_flags & ATT_ILLUSIONARY) {
                                      /* F6 46 EA 40; JE ->0x9A15C, argument pushes,
                                         at com1:0x9A154..0x9A158 */
                save_modifier -= 2;  /* two DEC AX instructions before the push;
                                         com1:0x9A15A..0x9A15B. AX, rather than [bp-0x2E],
                                         carries the adjusted modifier into the call. */
            }
#else
            /* MOV [bp-0x2E],AX at 131:0x9A154 160:=; no extra modifier test. */
#endif
            i = Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                        save_modifier, sbr_DEATH);
                                      /* copy helper 131:0x9A173 160:= com1:=;
                                         resistance call 131:0x9A179 160:= com1:=;
                                         store i 131:0x9A17F 160:= com1:= */
            local_damage[1] += i;    /* 8B 46 FC / 01 46 DA; 131:0x9A182..0x9A185 160:= com1:= */
            if (SpFx != 0) {         /* JE ->0x9A19E at 131:0x9A188..0x9A18C 160:= com1:= */
                Battle_Unit_Heal(attacker_battle_unit_idx, i, 1);
                                      /* lcall 0370:002A at 131:0x9A196 160:= com1:= */
            }
        }

        if (attack_flags & ATT_DESTRUCTION) {
                                      /* JE ->0x9A1E6, damage generation, at 131:0x9A19E..0x9A1A3 160:= com1:= */
            if (Combat_Resistance_Check(_battle_units[defender_battle_unit_idx],
                                        0, sbr_CHAOS) > 0) {
                                      /* copy helper 131:0x9A1C1 160:= com1:=;
                                         resistance call 131:0x9A1C7 160:= com1:=;
                                         JLE ->0x9A1E6 at 131:0x9A1CF 160:= com1:= */
#if BUILD == COM1
                local_damage[2] += COM1_DESTRUCTION_DAMAGE;
                                      /* fifteen NOPs com1:0x9A1D1..0x9A1DF;
                                         B0 64 / CBW / ADD [bp-0x24],AX at com1:0x9A1E0..0x9A1E3 */
#else
                local_damage[2] +=
                    (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* record read/add 131:0x9A1D1..0x9A1E3 160:= com1:- */
#endif
            }
        }
    }

    if (attack_flags & ATT_AUTOMATIC_DAMAGE) {
                                      /* JE ->0x9A207, rolled damage, at 131:0x9A1E6..0x9A1EB 160:= com1:= */
#if BUILD == COM1
        if (com1_attack_marker & COM1_ATTACK_MARKER_FULL) {
                                      /* F7 46 D0 01 00; JNE ->0x9A1FE, full-strength arm,
                                         at com1:0x9A1ED..0x9A1F2 */
            attack_damage = attack_strength; /* load com1:0x9A1FE; store com1:0x9A201 */
        } else {
            attack_damage = attack_strength / 2;
                                      /* signed CWD/SUB/SAR correction com1:0x9A1F4..0x9A1FA;
                                         JMP ->0x9A201, store, at com1:0x9A1FC */
        }
#else
        if (channel_attack_flags & ATT_AUTOMATIC_DAMAGE) {
                                      /* TEST is followed by JE ->0x9A1FE, the full-strength arm;
                                         the set-bit fall-through is the half-strength arm:
                                         131:0x9A1ED..0x9A1F2 160:= */
            attack_damage = attack_strength / 2;
                                      /* signed CWD/SUB/SAR correction 131:0x9A1F4..0x9A1FA 160:=;
                                         JMP ->0x9A201 at 0x9A1FC */
        } else {
            attack_damage = attack_strength; /* load 131:0x9A1FE 160:=; store 0x9A201 */
        }
#endif
        goto conventional_damage_ready; /* E9 D1 00 ->0x9A2D8, poison gate;
                                           131:0x9A204 160:= com1:= */
    }

#if BUILD == COM1
    int16_t attack_roll = CMB_AttackRoll(attack_strength, to_hit);
                                      /* call 0x98F60 at com1:0x9A20E; return remains in AX */
    com1_frame_helper_9984B();        /* E8 35 F6 ->0x9984B; com1:0x9A213; AX is attack_roll.
                                       * Real near callee, outside this assigned extent and assigned
                                       * separately under R6.2d; it shares this frame. Its effect
                                       * needed here is `attack_damage += attack_roll` at
                                       * 0x9984B (`01 46 F8`). It then stores
                                       * `com1_attack_floor = sar16(attack_roll - 5, 1)` through
                                       * 0x9984E..0x99853 (`2D 05 00 D1 F8 89 46 CC`). */

    /* com1:0x9A256..0x9A261 is an in-extent compiler address helper:
       AX=index; DX=0x6E; IMUL; LES BX,[0x922A]; ADD BX,AX; RET. It has a complete body here and
       corresponds to `&_battle_units[index]`, not a synthetic semantic helper. Calls are at
       com1:0x9A218 (defender SI) and com1:0x9A267 (attacker DI). */
    struct s_BATTLE_UNIT __far *blur_defender =
        com1_load_battle_unit_address(defender_battle_unit_idx);
                                      /* E8 3B 00 ->0x9A256; com1:0x9A218 */
    int16_t blur_chance = 0;          /* XOR CX,CX; com1:0x9A21B */
    if ((defender_all_enchantments & UE_INVISIBILITY)
                                      /* test [bp-0x2C],0x8000; JNE ->0x9A22B (add 20),
                                         com1:0x9A21D..0x9A222 */
        || (blur_defender->Abilities & UA_INVISIBILITY)) {
                                      /* test +0x1C,0x40; JE ->0x9A22E (controller read),
                                         com1:0x9A224..0x9A229 */
        blur_chance += COM1_INVISIBILITY_CHANCE;
                                      /* ADD CX,0x14; com1:0x9A22B */
    }

    int blur_present;
    if (blur_defender->controller_idx == _combat_attacker_player) {
                                      /* JNE ->0x9A246, defender-side Blur lookup,
                                         com1:0x9A22E..0x9A23B */
        blur_present = combat_enchantments[BLUR_ATTKR] > 0;
                                      /* JG ->0x9A24D, combine chance, at com1:0x9A23D..0x9A242;
                                         otherwise JMP ->0x9A265, attacker pointer, at com1:0x9A244 */
    } else {
        blur_present = combat_enchantments[BLUR_DFNDR] > 0;
                                      /* JLE ->0x9A265 at com1:0x9A246..0x9A24B */
    }
    if (blur_present) {
        if (blur_chance != 0) {       /* JNE ->0x9A262, set 30, at com1:0x9A24D..0x9A24F */
            blur_chance = COM1_STACKED_BLUR_CHANCE; /* MOV CX,0x1E; com1:0x9A262 */
        } else {
            blur_chance += COM1_BLUR_CHANCE;
                                      /* ADD CX,0x14; com1:0x9A251;
                                         JMP ->0x9A265 at com1:0x9A254 */
        }
    }

    struct s_BATTLE_UNIT __far *blur_attacker =
        com1_load_battle_unit_address(attacker_battle_unit_idx);
                                      /* E8 EC FF ->0x9A256; com1:0x9A267 */
    if (!(blur_attacker->Attribs_1 & USA_IMMUNITY_ILLUSION)
                                      /* JNE ->0x9A293, padding after Blur, at com1:0x9A26A..0x9A270 */
        && blur_chance != 0) {        /* JE ->0x9A293 at com1:0x9A272..0x9A274 */
        int16_t original_hits = attack_damage;
                                      /* PUSH DI / MOV DI,[bp-8]; com1:0x9A276..0x9A277 */
        while (original_hits != 0) {  /* OR DI,DI; JE ->0x9A292, restore DI, at com1:0x9A27A..0x9A27C */
            if (Random(100) <= blur_chance) {
                                      /* lcall 00B0:00D8 at com1:0x9A282;
                                         CMP AX,CX / JG ->0x9A28F, counter decrement,
                                         at com1:0x9A288..0x9A28A */
                --attack_damage;      /* FF 4E F8; com1:0x9A28C */
            }
            --original_hits;          /* DEC DI; com1:0x9A28F;
                                         JNE ->0x9A27A, loop test, at com1:0x9A290 */
        }
                                      /* POP DI com1:0x9A292; NOP padding com1:0x9A293..0x9A2A9 */
    }
#else
    attack_damage += CMB_AttackRoll(attack_strength, to_hit);
                                      /* call 0x98F60 at 131:0x9A20E 160:=;
                                         ADD [bp-8],AX 131:0x9A213 160:= */
    int blur_applies = 0;
    if ((int8_t)_battle_units[defender_battle_unit_idx].controller_idx
            == _combat_attacker_player
                                      /* JNE ->0x9A24E, second side test, at 131:0x9A223..0x9A22C 160:= */
        && combat_enchantments[BLUR_ATTKR] > 0
                                      /* JLE ->0x9A24E at 131:0x9A22E..0x9A237 160:= */
#if BUILD == MOM131
        && !(_battle_units[defender_battle_unit_idx].Attribs_1
             & USA_IMMUNITY_ILLUSION)) {
                                      /* 1.31 uses SI; JE ->0x9A286, Blur loop init,
                                         at 131:0x9A239..0x9A24C */
#else
        && !(_battle_units[attacker_battle_unit_idx].Attribs_1
             & USA_IMMUNITY_ILLUSION)) {
                                      /* CP uses DI; JE ->0x9A286 at 160:0x9A239..0x9A24C */
#endif
        blur_applies = 1;
    } else if ((int8_t)_battle_units[defender_battle_unit_idx].controller_idx
                   == _combat_defender_player
                                      /* JNE ->0x9A2AA, defense roll, at 131:0x9A25B..0x9A264 160:= */
               && combat_enchantments[BLUR_DFNDR] > 0
                                      /* JLE ->0x9A2AA at 131:0x9A266..0x9A26F 160:= */
#if BUILD == MOM131
               && !(_battle_units[defender_battle_unit_idx].Attribs_1
                    & USA_IMMUNITY_ILLUSION)) {
                                      /* 1.31 uses SI; JNE ->0x9A2AA at 131:0x9A271..0x9A284 */
#else
               && !(_battle_units[attacker_battle_unit_idx].Attribs_1
                    & USA_IMMUNITY_ILLUSION)) {
                                      /* CP uses DI; JNE ->0x9A2AA at 160:0x9A271..0x9A284 */
#endif
        blur_applies = 1;
    }
    if (blur_applies) {
        blur_i = 0;                   /* C7 46 FA 00 00; 131:0x9A286 160:= */
#if BUILD == MOM131
        while (blur_i < attack_damage) {
                                      /* initial JMP ->0x9A2A2 at 131:0x9A28B;
                                         JL ->0x9A28D, Random call, at 131:0x9A2A8 */
            if (Random(10) == 10) {   /* lcall 00B0:00D8 at 131:0x9A291;
                                         JNE ->0x9A29F, increment, at 131:0x9A29A */
                --attack_damage;      /* FF 4E F8; 131:0x9A29C */
            }
            ++blur_i;                 /* FF 46 FA; 131:0x9A29F */
        }
#else
        while (blur_i < attack_damage) {
                                      /* initial JMP ->0x9A2A2 at 160:0x9A28B;
                                         JL ->0x9A28D at 160:0x9A2A8 */
            if (Random(10) == 1) {    /* lcall 00B0:00D8 at 160:0x9A291;
                                         DEC AX / JNE ->0x9A29F, failure increment,
                                         at 160:0x9A297..0x9A298 */
                --attack_damage;      /* FF 4E F8; 160:0x9A29A */
                continue;             /* EB 03 ->0x9A2A2, loop test; 160:0x9A29D */
            }
            ++blur_i;                 /* FF 46 FA; 160:0x9A29F */
        }
#endif
    }
#endif

    attack_damage -= CMB_DefenseRoll(defense_special, defender_to_block);
                                      /* call 0x98F9D at 131:0x9A2B1 160:= com1:=;
                                         SUB [bp-8],AX at 131:0x9A2B6 160:= com1:= */
    if (defender_all_enchantments & UE_INVULNERABILITY) {
                                      /* high-word mask sequence 131:0x9A2B9..0x9A2C7 160:=;
                                         JE ->0x9A2CD, floor test, at 131:0x9A2C7 160:=;
                                         CoM shortened sequence com1:0x9A2B9..0x9A2BF,
                                         JE ->0x9A2C5, NOP/helper area, at com1:0x9A2BF */
        attack_damage -= 2;           /* 83 6E F8 02; 131:0x9A2C9 160:= com1:0x9A2C1 */
    }
#if BUILD == COM1
    /* com1:0x9A2C5..0x9A2C9 are five NOPs. */
    com1_frame_helper_9985B();        /* E8 8E F5 ->0x9985B; com1:0x9A2CA.
                                       * Real near callee outside this assigned extent and assigned
                                       * separately under R6.2d; it shares this frame. If
                                       * `defense_special < 80`, `attack_flags & ATT_DESTRUCTION`,
                                       * and `attack_damage < com1_attack_floor`, it overwrites
                                       * `attack_damage = com1_attack_floor` at 0x99870
                                       * (`89 46 F8`); all exits join at 0x99873. */
#endif
    if (attack_damage < 0) {          /* JGE ->0x9A2D8, poison gate, at 131:0x9A2CD..0x9A2D1 160:= com1:= */
        attack_damage = 0;            /* C7 46 F8 00 00; 131:0x9A2D3 160:= com1:= */
    }

conventional_damage_ready:
    if ((_battle_units[attacker_battle_unit_idx].attack_attributes & ATT_POISON)
                                      /* JNE ->0x9A2F0, immunity test, at 131:0x9A2D8..0x9A2EB 160:= com1:=;
                                         false JMP ->0x9A387, rider sum, at 131:0x9A2ED 160:= com1:= */
        && !(_battle_units[defender_battle_unit_idx].Attribs_1
             & USA_IMMUNITY_POISON)) {
                                      /* JE ->0x9A308, poison loop init, at 131:0x9A2F0..0x9A303 160:= com1:=;
                                         true JMP ->0x9A387 at 131:0x9A305 160:= com1:= */
        i = 0;                        /* C7 46 FC 00 00; 131:0x9A308 160:= com1:= */
        goto poison_test;             /* EB 61 ->0x9A370; 131:0x9A30D 160:= com1:= */
        do {
#if BUILD == COM1
            /* AX=-1 is pushed once as realm and, because 0x9A313..0x9A314 are NOPs, again as
               modifier. Realm and modifier are both -1. */
            int16_t poison_margin = Combat_Resistance_Check(
                _battle_units[defender_battle_unit_idx], -1, sbr_NONE);
                                      /* MOV AX,-1/PUSH at com1:0x9A30F..0x9A312;
                                         NOP,NOP/PUSH at com1:0x9A313..0x9A315 */
#else
            int16_t poison_margin = Combat_Resistance_Check(
                _battle_units[defender_battle_unit_idx], 0, sbr_NONE);
                                      /* MOV AX,-1/PUSH, XOR AX,AX/PUSH at
                                         131:0x9A30F..0x9A315 160:= */
#endif
                                      /* copy helper 131:0x9A32B 160:= com1:=;
                                         resistance call 131:0x9A331 160:= com1:=;
                                         JLE ->0x9A36D, increment, at 131:0x9A339 160:= com1:= */
            if (poison_margin > 0) {
#if BUILD == MOM131
                if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A36A, regular bucket, at 131:0x9A348..0x9A34E */
                    && !(_battle_units[defender_battle_unit_idx].Attribs_1
                         & USA_CREATE_UNDEAD_BLOCK_131)) {
                                      /* test raw 0x0020; JNE ->0x9A36A at 131:0x9A35D..0x9A363 */
#else
                if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A36A at 131:- 160:0x9A348..0x9A34E
                                         com1:0x9A348..0x9A34E */
                    && !(_battle_units[defender_battle_unit_idx].Attribs_1
                         & USA_CREATE_UNDEAD_BLOCK_LATER)) {
                                      /* raw mask 0x0060; JNE ->0x9A36A at
                                         131:- 160:0x9A35D..0x9A363 com1:0x9A35D..0x9A363 */
#endif
                    ++local_damage[1]; /* FF 46 DA; 131:0x9A365 160:= com1:= */
                } else {
                    ++local_damage[0]; /* FF 46 D8; 131:0x9A36A 160:= com1:= */
                }
            }
            ++i;                     /* FF 46 FC; 131:0x9A36D 160:= com1:= */
poison_test:
            ;                         /* attacker Poison_Strength read at 131:0x9A370..0x9A381 160:= com1:= */
        } while ((int8_t)_battle_units[attacker_battle_unit_idx].Poison_Strength > i);
                                      /* JG ->0x9A30F, poison body, at 131:0x9A385 160:= com1:= */
    }

    target_damage = 0;               /* C7 46 E0 00 00; 131:0x9A387 160:= com1:= */
    i = 0;                           /* C7 46 FC 00 00; 131:0x9A38C 160:= com1:= */
    goto sum_riders_test;             /* EB 12 ->0x9A3A5; 131:0x9A391 160:= com1:= */
    do {
        target_damage += local_damage[i];
                                      /* indexed load/add 131:0x9A393..0x9A39F 160:= com1:= */
        ++i;                          /* FF 46 FC; 131:0x9A3A2 160:= com1:= */
sum_riders_test:
        ;
    } while (i < NUM_DAMAGE_TYPES);  /* JL ->0x9A393, sum body, at 131:0x9A3A9 160:= com1:= */
    target_damage += defender_front_damage;
                                      /* 8B 46 DE / 01 46 E0; 131:0x9A3AB..0x9A3AE 160:= com1:= */
    goto figure_coverage_test;        /* E9 1A 01 ->0x9A4CE; 131:0x9A3B1 160:= com1:= */

    /* The binary enters this body when defender hits <= attack_damage + target_damage.
       At 0x9A4E6 it compares hits against that sum; JG exits to 0x9A4ED, while the other arm
       jumps back here. */
    do {
        attack_damage -= (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* SUB [bp-8],AX; 131:0x9A3B4..0x9A3C6 160:= com1:= */
        if (attack_damage < 0) {      /* JGE ->0x9A43E, whole-figure arm, at 131:0x9A3C9..0x9A3CD 160:= com1:= */
#if BUILD == MOM131
            if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A416, regular bucket, at 131:0x9A3DC..0x9A3E2 */
                && !(_battle_units[defender_battle_unit_idx].Attribs_1
                     & USA_CREATE_UNDEAD_BLOCK_131)) {
                                      /* raw 0x0020; JNE ->0x9A416 at 131:0x9A3F1..0x9A3F7 */
#else
            if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A416 at 160:0x9A3DC..0x9A3E2
                                         com1:0x9A3DC..0x9A3E2 */
                && !(_battle_units[defender_battle_unit_idx].Attribs_1
                     & USA_CREATE_UNDEAD_BLOCK_LATER)) {
                                      /* raw 0x0060; JNE ->0x9A416 at 160:0x9A3F1..0x9A3F7
                                         com1:0x9A3F1..0x9A3F7 */
#endif
                damage_types[1] +=
                    (int8_t)_battle_units[defender_battle_unit_idx].hits + attack_damage;
                                      /* pointer bucket +2 write 131:0x9A3F9..0x9A411 160:= com1:=;
                                         JMP ->0x9A430, accounting join, at 131:0x9A414 160:= com1:= */
            } else {
                damage_types[0] +=
                    (int8_t)_battle_units[defender_battle_unit_idx].hits + attack_damage;
                                      /* pointer bucket +0 write 131:0x9A416..0x9A42E 160:= com1:= */
            }
            target_damage += attack_damage; /* 8B 46 F8 / 01 46 E0; 131:0x9A430..0x9A433 160:= com1:= */
            attack_damage = 0;       /* C7 46 F8 00 00; 131:0x9A436 160:= com1:= */
            goto figure_coverage_test; /* E9 90 00 ->0x9A4CE; 131:0x9A43B 160:= com1:= */
        }

#if BUILD == MOM131
        if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A482 at 131:0x9A44B..0x9A451 */
            && !(_battle_units[defender_battle_unit_idx].Attribs_1
                 & USA_CREATE_UNDEAD_BLOCK_131)) {
                                      /* raw 0x0020; JNE ->0x9A482 at 131:0x9A460..0x9A466 */
#else
        if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A482 at 160:0x9A44B..0x9A451
                                         com1:0x9A44B..0x9A451 */
            && !(_battle_units[defender_battle_unit_idx].Attribs_1
                 & USA_CREATE_UNDEAD_BLOCK_LATER)) {
                                      /* raw 0x0060; JNE ->0x9A482 at 160:0x9A460..0x9A466
                                         com1:0x9A460..0x9A466 */
#endif
            damage_types[1] +=
                (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* pointer bucket +2 write 131:0x9A468..0x9A47D 160:= com1:=;
                                         JMP ->0x9A499, defense gate, at 131:0x9A480 160:= com1:= */
        } else {
            damage_types[0] +=
                (int8_t)_battle_units[defender_battle_unit_idx].hits;
                                      /* pointer bucket +0 write 131:0x9A482..0x9A497 160:= com1:= */
        }

        if (!(attack_flags & ATT_AUTOMATIC_DAMAGE)) {
                                      /* JNE ->0x9A4C3, floor test, at 131:0x9A499..0x9A49E 160:= com1:= */
            attack_damage -= CMB_DefenseRoll(defense_special, defender_to_block);
                                      /* call 0x98F9D at 131:0x9A4A7 160:= com1:=;
                                         SUB [bp-8],AX at 131:0x9A4AC 160:= com1:= */
            if (defender_all_enchantments & UE_INVULNERABILITY) {
                                      /* high-word test; JE ->0x9A4C3 at 131:0x9A4AF..0x9A4BD 160:= com1:= */
                attack_damage -= 2;  /* 83 6E F8 02; 131:0x9A4BF 160:= com1:= */
            }
        }
        if (attack_damage < 0) {      /* JGE ->0x9A4CE, coverage test, at 131:0x9A4C3..0x9A4C7 160:= com1:= */
            attack_damage = 0;       /* C7 46 F8 00 00; 131:0x9A4C9 160:= com1:= */
        }

figure_coverage_test:
        ;                             /* compare hits with attack_damage+target_damage
                                         131:0x9A4CE..0x9A4E6 160:= com1:= */
    } while ((int8_t)_battle_units[defender_battle_unit_idx].hits
             <= attack_damage + target_damage);
                                      /* JG ->0x9A4ED, remaining-damage routing, at 131:0x9A4E8 160:= com1:=;
                                         otherwise JMP ->0x9A3B4, body, at 131:0x9A4EA 160:= com1:= */

#if BUILD == MOM131
    if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A522, regular bucket, at 131:0x9A4FA..0x9A500 */
        && !(_battle_units[defender_battle_unit_idx].Attribs_1
             & USA_CREATE_UNDEAD_BLOCK_131)) {
                                      /* raw 0x0020; JNE ->0x9A522 at 131:0x9A50F..0x9A515 */
#else
    if ((_battle_units[attacker_battle_unit_idx].Abilities & UA_CREATE_UNDEAD)
                                      /* JE ->0x9A522 at 160:0x9A4FA..0x9A500
                                         com1:0x9A4FA..0x9A500 */
        && !(_battle_units[defender_battle_unit_idx].Attribs_1
             & USA_CREATE_UNDEAD_BLOCK_LATER)) {
                                      /* raw 0x0060; JNE ->0x9A522 at 160:0x9A50F..0x9A515
                                         com1:0x9A50F..0x9A515 */
#endif
        damage_types[1] += attack_damage;
                                      /* pointer bucket +2 write 131:0x9A517..0x9A51D 160:= com1:=;
                                         JMP ->0x9A52A, running-front update, at 131:0x9A520 160:= com1:= */
    } else {
        damage_types[0] += attack_damage;
                                      /* pointer bucket +0 write 131:0x9A522..0x9A528 160:= com1:= */
    }

    defender_front_damage = target_damage + attack_damage;
                                      /* load/add/store 131:0x9A52A..0x9A530 160:= com1:= */
    attack_damage = 0;               /* C7 46 F8 00 00; 131:0x9A533 160:= com1:= */
    unused_1c = 0;                   /* C7 46 E4 00 00; 131:0x9A538 160:= com1:= */
    i = 0;                           /* C7 46 FC 00 00; 131:0x9A53D 160:= com1:= */
    goto flush_riders_test;           /* EB 29 ->0x9A56D; 131:0x9A542 160:= com1:= */
    do {
        damage_types[i] += local_damage[i];
                                      /* indexed pointer/local loads and pointer write
                                         131:0x9A544..0x9A55A 160:= com1:= */
        local_damage[i] = 0;         /* C7 07 00 00; 131:0x9A55C..0x9A566 160:= com1:= */
        ++i;                          /* FF 46 FC; 131:0x9A56A 160:= com1:= */
flush_riders_test:
        ;
    } while (i < NUM_DAMAGE_TYPES);  /* JL ->0x9A544, flush body, at 131:0x9A571 160:= com1:= */

    ++itr_damage_types;                   /* FF 46 FE; 131:0x9A573 160:= com1:= */
test_figures:
    ;
} while (itr_damage_types < Figs);        /* CMP at 131:0x9A576..0x9A579 160:= com1:=;
                                       JGE ->0x9A581, epilogue, at 131:0x9A57C 160:= com1:=;
                                       JMP ->0x99F5A, figure body, at 131:0x9A57E 160:= com1:= */

/* POP DI, POP SI, MOV SP,BP, POP BP, RETF:
   131:0x9A581..0x9A586 160:= com1:= */
}
#if BUILD == COM1
/* Complete in-extent compiler helper called at 0x9A218 and 0x9A267. */
static struct s_BATTLE_UNIT __far *com1_load_battle_unit_address(int16_t index)
{
    return &_battle_units[index];    /* com1:0x9A256..0x9A261 */
}

/* Near callee at 0x9AC1B sharing BU_ProcessAttack's BP frame and live ES:BX attacker. */
void __near com1_frame_helper_9AC1B(void)
{
    if (SpFx == 0)                    /* CMP [BP+12],0; JE ->0x9AC8E at
                                          com1:0x9AC1B..0x9AC1F */
        return;

    /* PUSH ES; PUSH BX at com1:0x9AC21..0x9AC22 preserve the attacker record. */
    struct s_UNIT __far *unit = &_UNITS[attacker_bu->unit_idx];
                                       /* com1:0x9AC23..0x9AC2F */
    if ((int8_t)unit->Hero_Slot <= ST_UNDEFINED)
                                       /* JLE ->0x9AC8C at com1:0x9AC37 */
        goto restore_and_return;
    if ((int8_t)unit->owner_idx <= ST_UNDEFINED)
                                       /* JLE ->0x9AC8C at com1:0x9AC3F */
        goto restore_and_return;

    uint8_t level_plus_one = (uint8_t)unit->Level;
                                       /* zero-extended into CX at com1:0x9AC41..0x9AC48 */
    struct s_HERO __far *hero =
        &_HEROES2[(uint8_t)unit->owner_idx]->heroes[(uint8_t)unit->type];
                                       /* owner/type indexing at com1:0x9AC43..0x9AC5C */
    uint8_t flags_0B = *((uint8_t __far *)hero + 0x0B);
    uint8_t factor = 2;               /* com1:0x9AC5E */
    if (!(flags_0B & COM1_HERO_BYTE_0B_FACTOR_2))
                                       /* JNE ->0x9AC70 at com1:0x9AC65 */
    {
        if (!(flags_0B & COM1_HERO_BYTE_0B_FACTOR_3))
                                       /* JE ->0x9AC8C at com1:0x9AC6C */
            goto restore_and_return;
        ++factor;                     /* com1:0x9AC6E */
    }

    /* POP BX; POP ES at com1:0x9AC70..0x9AC71 restore the attacker record. */
    ++level_plus_one;                 /* INC CL at com1:0x9AC72; wraps modulo 256 */
    uint16_t product = (uint16_t)((int16_t)(int8_t)factor
                                * (int16_t)(int8_t)level_plus_one);
                                       /* signed byte IMUL CL at com1:0x9AC74 */
    uint8_t mana = (uint8_t)(attacker_bu->mana + (product >> 1));
                                       /* logical SHR AX,1 at com1:0x9AC76;
                                          ADD AL,[+40] at com1:0x9AC78 */
    if (mana > (uint8_t)attacker_bu->mana_max)
                                       /* JBE ->0x9AC86 at com1:0x9AC80 */
        mana = (uint8_t)attacker_bu->mana_max; /* com1:0x9AC82 */
    attacker_bu->mana = mana;         /* non-frame write at com1:0x9AC86 */
    return;                           /* JMP ->0x9AC8E at com1:0x9AC8A; RET at 0x9AC8E */

restore_and_return:
    /* POP BX; POP ES at com1:0x9AC8C..0x9AC8D; RET at 0x9AC8E. */
    return;
}

/* Two near callees sharing BU_ProcessAttack's frame. */
void __near com1_frame_helper_9984B(void)
{
    attack_damage += attack_roll_ax;  /* ADD [BP-8],AX at com1:0x9984B */
    attack_roll_ax -= 5;              /* SUB AX,5 at com1:0x9984E */
    attack_roll_ax = sar16(attack_roll_ax, 1);
                                       /* bare SAR AX,1 at com1:0x99851 */
    com1_attack_floor = attack_roll_ax; /* MOV [BP-34],AX at com1:0x99853 */
    return;                            /* RET at com1:0x99856 */
}

/* Four NOP bytes at com1:0x99857..0x9985A. */

void __near com1_frame_helper_9985B(void)
{
    if (defense_special >= COM1_DESTRUCTION_FLOOR_GATE)
                                       /* JGE ->0x99873 at com1:0x9985F */
        return;
    if (!(attack_flags & ATT_DESTRUCTION))
                                       /* JE ->0x99873 at com1:0x99866 */
        return;
    if (attack_damage >= com1_attack_floor)
                                       /* JGE ->0x99873 at com1:0x9986E */
        return;
    attack_damage = com1_attack_floor; /* com1:0x99870 */
    return;                            /* RET at com1:0x99873 */
}

/* Relocated tail entered only by com1:0x9ACFE (E9 73 EB, JMP ->0x99874). */
void com1_relocated_battle_unit_tail(void)
{
    int16_t index = 0;                /* XOR SI,SI at com1:0x99874 */
    do {
        struct s_BATTLE_UNIT __far *bu = &_battle_units[index];
                                       /* com1:0x99876..0x9987F */
        overlay_03A0_003E(bu);        /* com1:0x9988B */
        overlay_03A0_0052(bu);        /* com1:0x99892 */
        ++index;                      /* com1:0x99899 */
    } while (index < _combat_total_unit_count);
                                       /* CMP SI,[C588]; JL ->0x99876 at
                                          com1:0x9989A..0x9989E */

    /* POP DI, POP SI, MOV SP,BP, POP BP, RETF at com1:0x998A0..0x998A5. */
}

/* Twenty-seven NOP bytes at com1:0x998A6..0x998C0. */
#endif

/* ===========================================================================
 * D35 -- CoM 1 Raise Dead combat routine and dispatcher case.
 * Complete coverage, call/branch/write inventories, patched-byte accounting,
 * and the SPELLDAT binding are in D35.evidence.md.
 * ======================================================================== */
#if BUILD == COM1
void __far CMB_Raise_Dead(int16_t player_idx, int16_t caster_idx,
                          int16_t cgx, int16_t cgy)
{
    int16_t candidate_names[RAISE_DEAD_CANDIDATE_SLOTS];
    int16_t candidate_units[RAISE_DEAD_CANDIDATE_SLOTS];
    int16_t candidate_count = 0;
    int16_t selected = RAISE_DEAD_NO_SELECTION;
    int16_t candidate_scan_idx;
    int16_t raised_battle_unit_idx;

    overlay_0518_0025();                         /* 131:—  160:—  com1:0xAB055 */
    overlay_00E0_001A();                         /* 131:—  160:—  com1:0xAB05A */
    overlay_0318_0020();                         /* 131:—  160:—  com1:0xAB05F */
    overlay_0008_0503();                         /* 131:—  160:—  com1:0xAB064 */
    overlay_00E0_0073();                         /* 131:—  160:—  com1:0xAB069 */
    /* JMP ->0xAB073 at 131:—  160:—  com1:0xAB06E; jump-skipped [0xAB070,0xAB073). */

    for (candidate_scan_idx = 0;
         candidate_scan_idx < _combat_total_unit_count;
         ++candidate_scan_idx) {                 /* init 131:—  160:—  com1:0xAB073; test 131:—  160:—  com1:0xAB14A */
        struct s_BATTLE_UNIT __far *bu = &_battle_units[candidate_scan_idx];
        struct s_UNIT __far *u;

        if ((int8_t)bu->status <= BUS_UNKNOWN_3) /* JG ->0xAB094 at 131:—  160:—  com1:0xAB08F */
            continue;                            /* JMP ->0xAB149 at 131:—  160:—  com1:0xAB091 */
        if ((int8_t)bu->controller_idx != player_idx)
            continue;                            /* JNE ->0xAB091 at 131:—  160:—  com1:0xAB09C */
        if ((int8_t)bu->race >= RACE_FIRST_FANTASTIC)
            continue;                            /* JGE ->0xAB091 at 131:—  160:—  com1:0xAB0A3 */
        if ((int8_t)bu->status == BUS_GONE)
            continue;                            /* JE ->0xAB091 at 131:—  160:—  com1:0xAB0AA */
        if ((int8_t)bu->status == BUS_UNKNOWN_3)
            continue;                            /* redundant JE ->0xAB091 at 131:—  160:—  com1:0xAB0B1 */
        u = &_UNITS[bu->unit_idx];               /* 131:—  160:—  com1:0xAB0B3 */
        if ((uint8_t)u->wp == UNIT_WP_GONE)
            continue;                            /* JE ->0xAB091 at 131:—  160:—  com1:0xAB0C6 */

        candidate_names[candidate_count] =
            COM1_RAISE_DEAD_NAME_BUFFER
            + candidate_count * RAISE_DEAD_NAME_BYTES;
                                                 /* 131:—  160:—  com1:0xAB0C8..0xAB0DD */
        /* CoM patch NOP at [0xAB0D7,0xAB0D8); 28 NOPs at [0xAB0DF,0xAB0FB)
         * occupy the exact space between the two local-array stores. */
        candidate_units[candidate_count] = candidate_scan_idx;
                                                 /* 131:—  160:—  com1:0xAB0FB..0xAB105 */
        overlay_0000_3C37((char *)candidate_names[candidate_count],
                          unit_types[(uint8_t)u->type].name);
                                                 /* call 131:—  160:—  com1:0xAB13F */
        ++candidate_count;                       /* 131:—  160:—  com1:0xAB146 */
        /* No eight-slot bound check precedes either local-array write. */
    }                                            /* JGE ->0xAB153 at 131:—  160:—  com1:0xAB14E;
                                                   JMP ->0xAB07D at 131:—  160:—  com1:0xAB150 */

    if (candidate_count > 0) {                   /* JLE ->0xAB1A9 at 131:—  160:—  com1:0xAB15C */
        if (player_idx != 0) {
            selected = 0;                        /* 131:—  160:—  com1:0xAB15E..0xAB164 */
        } else if (candidate_count == 1) {
            selected = 0;                        /* 131:—  160:—  com1:0xAB16B..0xAB171 */
        } else {
            /* CMP candidate_count,7 at 0xAB178 is followed by two NOPs, not a branch.
             * Live pushes are count, names, 0, and the 0x686F prompt. */
            selected = overlay_04A8_003E(candidate_count, candidate_names, 0,
                                         (char *)COM1_RAISE_DEAD_PROMPT);
                                                 /* JMP ->0xAB19E at 131:—  160:—  com1:0xAB18C;
                                                    call 131:—  160:—  com1:0xAB19E */
        }
    }

    /* Dormant [0xAB18E,0xAB19E) pushes 6, names, 1, and the same prompt, then
     * falls into the call. No direct branch/call enters that argument builder. */
    overlay_00E0_001A();                         /* 131:—  160:—  com1:0xAB1A9 */
    overlay_0318_0020();                         /* 131:—  160:—  com1:0xAB1AE */
    overlay_0008_0503();                         /* 131:—  160:—  com1:0xAB1B3 */
    if (selected == RAISE_DEAD_NO_SELECTION)
        goto cleanup;                            /* JNE ->0xAB1C1 at 131:—  160:—  com1:0xAB1BC;
                                                   JMP ->0xAB45F at 131:—  160:—  com1:0xAB1BE */

    if (player_idx != 0) {                       /* JE ->0xAB222 at 131:—  160:—  com1:0xAB1C5 */
        do {
            if (player_idx == _combat_attacker_player)
                cgx = 14 - Random(3);            /* JNE ->0xAB1E4 at 131:—  160:—  com1:0xAB1CE;
                                                   call/write 131:—  160:—  com1:0xAB1D4/0xAB1DF */
            else
                cgx = 8 + Random(2);             /* call/write 131:—  160:—  com1:0xAB1E8/0xAB1F1 */
            cgy = 8 + Random(3);                 /* call/write 131:—  160:—  com1:0xAB1F8/0xAB201 */
        } while ((int8_t)com1_combat_grid_rows[cgy][cgx] >= 0);
                                                 /* JGE ->0xAB1C7 at 131:—  160:—  com1:0xAB213 */
        raised_battle_unit_idx = com1_ai_raise_dead_target;
                                                 /* 131:—  160:—  com1:0xAB215 */
        /* CoM patch NOPs occupy [0xAB219,0xAB220). */
    } else {
        raised_battle_unit_idx = candidate_units[selected];
                                                 /* 131:—  160:—  com1:0xAB222..0xAB22C */
    }

    {
        struct s_BATTLE_UNIT __far *bu = &_battle_units[raised_battle_unit_idx];
        struct s_UNIT __far *u;
        int8_t max_figures = (int8_t)bu->Max_Figures;

        if ((max_figures & 1) == 0) {             /* JNE ->0xAB250 at 131:—  160:—  com1:0xAB241 */
            bu->Cur_Figures = max_figures >> 1;   /* byte SAR at 131:—  160:—  com1:0xAB243/0xAB245 */
            bu->front_figure_damage = 0;          /* 131:—  160:—  com1:0xAB249 */
        } else {
            max_figures = (int8_t)(max_figures + 1); /* byte INC wraps; 131:—  160:—  com1:0xAB250 */
            bu->Cur_Figures = max_figures >> 1;   /* byte SAR/store 131:—  160:—  com1:0xAB252/0xAB254 */
            bu->front_figure_damage = (int8_t)bu->hits >> 1;
                                                 /* byte SAR/store 131:—  160:—  com1:0xAB258..0xAB25E */
        }

        bu->Combat_Effects = 0;                  /* 131:—  160:—  com1:0xAB26F */
        bu->Move_Flags &= (uint16_t)~(MV_UNKNOWN_0800 | MV_UNKNOWN_1000);
                                                 /* raw byte AND 0xE7 at +0x17; 131:—  160:—  com1:0xAB275 */
        bu->enchantments = 0;                    /* high/low words 131:—  160:—  com1:0xAB27A/0xAB280 */
        bu->cgx = bu->target_cgx = cgx;           /* 131:—  160:—  com1:0xAB286..0xAB297 */
        bu->cgy = bu->target_cgy = cgy;           /* 131:—  160:—  com1:0xAB28D..0xAB29E */
        bu->move_anim_ctr = 0;                    /* 131:—  160:—  com1:0xAB2A2 */
        bu->Web_HP = 0;                           /* 131:—  160:—  com1:0xAB2A8 */
        bu->Confusion_State = 0;                  /* 131:—  160:—  com1:0xAB2AD */
        bu->outline_magic_realm = 0;              /* 131:—  160:—  com1:0xAB2B2 */
        bu->race = rt_Fantastic_No_Realm;         /* raw 0x15; 131:—  160:—  com1:0xAB2B8 */
        bu->Attribs_1 &= (uint16_t)~USA_UNKNOWN_8000;
                                                 /* raw high-byte AND 0x7F; 131:—  160:—  com1:0xAB2BD */
        bu->Grey_Hits = GREY_HITS_UNINITIALIZED;  /* raw 0xFF sentinel; 131:—  160:—  com1:0xAB2C2 */
        bu->Atk_FigLoss = 0;                      /* 131:—  160:—  com1:0xAB2C7 */
        bu->Moving = 0;                           /* 131:—  160:—  com1:0xAB2CD */
        bu->action = 0;                           /* 131:—  160:—  com1:0xAB2D3 */

        /* CoM patch NOPs occupy [0xAB2D9,0xAB314). */
        u = &_UNITS[bu->unit_idx];               /* 131:—  160:—  com1:0xAB314 */
        u->enchantments = 0;                     /* high/low words 131:—  160:—  com1:0xAB324/0xAB32A */
        /* CoM patch NOPs occupy [0xAB330,0xAB393). */
        u->Level = (int8_t)Calc_Unit_Level(bu->unit_idx);
                                                 /* call/store 131:—  160:—  com1:0xAB393/0xAB3A6 */
        /* CoM patch NOPs occupy [0xAB3AA,0xAB3C3). */
        bu->bufpi = Combat_Figure_Load((uint8_t)u->type,
                                       Battle_Unit_Pict_Open());
                                                 /* calls/store 131:—  160:—  com1:0xAB3C3/0xAB3EB/0xAB401 */
        bu->status = BUS_ACTIVE;                 /* 131:—  160:—  com1:0xAB412 */
        BU_Construct(bu);                        /* 131:—  160:—  com1:0xAB429 */
        BU_Apply_Battlefield_Effects(bu);        /* 131:—  160:—  com1:0xAB442 */
        overlay_0428_0066(raised_battle_unit_idx, cgx, cgy,
                          SPELL_RAISE_DEAD, caster_idx);
                                                 /* five words; call 131:—  160:—  com1:0xAB457 */
    }

cleanup:
    overlay_00E0_001A();                         /* 131:—  160:—  com1:0xAB45F */
    overlay_0318_0020();                         /* 131:—  160:—  com1:0xAB464 */
    overlay_0008_0503();                         /* 131:—  160:—  com1:0xAB469 */
    return;                                      /* sole RETF at 131:—  160:—  com1:0xAB473 */
}

/* Source-shaped fragment of Cast_Spell_On_Battle_Unit. The enclosing routine derives
 * player_idx in [bp-6]; JNE at 0x82ED4 and normal fallthrough both reach the next
 * spell comparison at 0x82EEA. */
void com1_raise_dead_dispatch_fragment(int16_t spell_idx, int16_t player_idx,
                                        int16_t caster_idx, int16_t target_cgx,
                                        int16_t target_cgy)
{
    if (spell_idx == SPELL_RAISE_DEAD) {          /* 131:—  160:—  com1:0x82ED0; JNE ->0x82EEA at 0x82ED4 */
        CMB_Raise_Dead(player_idx, caster_idx, target_cgx, target_cgy);
                                                 /* 0418:0048; call 131:—  160:—  com1:0x82EE2 */
    }                                            /* caller cleanup 131:—  160:—  com1:0x82EE7 */
}
#endif

/* =====================================================================================
 * F250.3 Mind Storm / True Sight combat writer fragments.
 * Source-shaped C instruction notation, not a recovered callable signature or emulator.
 * F250.3.mind-truesight.evidence.md owns scope, machine notation and semantic field mapping.
 * Initial/review/revision artifacts remain immutable. Calls are opaque whole-state transitions.
 * Register names denote live machine values; L/LB denote current SS:BP memory, not C locals.
 * W/B denote current segmented memory with 16-bit offset wrap. push16/pop16 use actual stack.
 * BADDR/SADDR/BARG/CALL6 below are notation expansions, not invented game callees.
 * BUILD and TAIL select a source fragment at presentation time, never game runtime tests.
 * Every unqualified address below is shared by 131/160/com1 except explicitly versioned arms
 * and the tails, which are 131/160 only. The evidence ledger fixes per-build coverage.
 * ===================================================================================== */

#define F250_MT_BATTLE_STRIDE               0x006E
#define F250_MT_SPELL_STRIDE                0x0024
#define F250_MT_BATTLE_POINTER_DS           0x922A
#define F250_MT_BATTLE_SEGMENT_DS           0x922C
#define F250_MT_SPELL_POINTER_DS            0x912C
#define F250_MT_BU_ATTRIBS1                 0x18
#define F250_MT_BU_COMBAT_EFFECTS           0x22
#define F250_MT_BU_ENCHANTMENTS_LO          0x3A
#define F250_MT_BU_ENCHANTMENTS_HI          0x3C
#define F250_MT_BU_UNKNOWN_07               0x07
#define F250_MT_BU_UNKNOWN_33               0x33
#define F250_MT_BU_UNKNOWN_54               0x54
#define F250_MT_SPELL_REALM                 0x17
#define F250_MT_REALM_SORCERY               1
#define F250_MT_REALM_CHAOS                 2
#define F250_MT_REALM_DEATH                 4
#define F250_MT_SPELL_EFFECT_WORD           0x20
#define F250_MT_SPELL_EFFECT_HI             0x22
#define F250_MT_FRAME_AGGREGATE_UNKNOWN_BIT 0x4000
#define F250_MT_SPECIAL_INDEX_5             0x0005
#define F250_MT_SPECIAL_INDEX_131_160       0x0046
#define F250_MT_SPECIAL_INDEX_COM1          0x004D
#define F250_MT_NEARCALL_INDEX_COM1         0x005E
#define F250_MT_COMBAT_EFFECT_UNKNOWN_0800  0x0800
#define F250_MT_UNKNOWN_33_VALUE            0x0C
#define F250_MT_UNKNOWN_54_VALUE            0x0004

/* The following four macros define instruction notation only. Their registers, segmented
 * memory lvalues and push/pop/call primitives are abstract machine aliases, not library/game
 * functions. FLAGS effects are implicit. Macro invocations carry the relevant site annotations.
 */
/* BADDR(): actual MOV / MOV / IMUL / LES / ADD sequence */
#define BADDR() do { \
    AX = SI; \
    DX = F250_MT_BATTLE_STRIDE; \
    DX_AX = s16(AX) * s16(DX); \
    ES_BX = far_pointer_at_current_DS(F250_MT_BATTLE_POINTER_DS); \
    BX = u16(BX + AX); \
} while (0)

/* SADDR(): actual MOV / MOV / IMUL / LES / ADD sequence */
#define SADDR() do { \
    AX = DI; \
    DX = F250_MT_SPELL_STRIDE; \
    DX_AX = s16(AX) * s16(DX); \
    ES_BX = far_pointer_at_current_DS(F250_MT_SPELL_POINTER_DS); \
    BX = u16(BX + AX); \
} while (0)

/* BARG(): separate offset and segment reads, not LES */
#define BARG() do { \
    AX = SI; \
    DX = F250_MT_BATTLE_STRIDE; \
    DX_AX = s16(AX) * s16(DX); \
    DX = DS_word(F250_MT_BATTLE_POINTER_DS); \
    DX = u16(DX + AX); \
    push16(DS_word(F250_MT_BATTLE_SEGMENT_DS)); \
    push16(DX); \
} while (0)

/* CALL6(): pushes occur in this chronological order */
#define CALL6() do { \
    push16(L(+0x0A)); \
    push16(L(+0x12)); \
    push16(L(-0x06)); \
    push16(DI); \
    push16(L(+0x0E)); \
    push16(L(+0x0C)); \
    opaque_far_call(0x0418, 0x0043); \
    SP = u16(SP + 0x000C); \
} while (0)

/* Analysis wrapper around the two alternative entries, NOT a recovered game function/ABI.
 * Select class14_82451 or class1_15_8262D as the entry; TAIL selects the corresponding old-build
 * expansion. The wrapper return marks only the boundary at 0x82F61, whose body is outside scope.
 * This C-shaped notation is not a standalone compilable translation: machine aliases are explicit
 * unresolved notation rather than fabricated C ABI contracts for the opaque game calls.
 */
static void F250_MT_fragment_notation(void)
{
class14_82451:
    BADDR();                                  /* 131:0x82451,0x8245C 160:= com1:=; 0x82451–0x8245C */
    if ((W(ES_BX, F250_MT_BU_ATTRIBS1) & USA_IMMUNITY_MAGIC) == 0)       /* 131:0x8245E,0x82464 160:= com1:=; 0x8245E, 0x82464 */
        goto guard_8246E;
    if (DI == F250_MT_SPECIAL_INDEX_5)                         /* 131:0x82466,0x82469 160:= com1:=; 0x82466, 0x82469 */
        goto guard_8246E;
    goto rejected_8261B;                      /* 131:0x8246B 160:= com1:=; 0x8246B */

guard_8246E:
    SADDR();                                  /* 131:0x8246E,0x82479 160:= com1:=; 0x8246E–0x82479 */
    if (B(ES_BX, F250_MT_SPELL_REALM) == F250_MT_REALM_CHAOS)                  /* 131:0x8247B,0x82480 160:= com1:=; 0x8247B, 0x82480 */
        goto aggregate_82496;

    SADDR();                                  /* 131:0x82482,0x8248D 160:= com1:=; 0x82482–0x8248D: reload */
    if (B(ES_BX, F250_MT_SPELL_REALM) != F250_MT_REALM_DEATH)                  /* 131:0x8248F,0x82494 160:= com1:=; 0x8248F, 0x82494 */
        goto guard_824A9;

aggregate_82496:
    AX = L(-0x0C);                           /* 131:0x82496 160:= com1:=; 0x82496 */
    DX = L(-0x0E);                           /* 131:0x82499 160:= com1:=; 0x82499 */
    DX &= 0;                                  /* 131:0x8249C 160:= com1:=; 0x8249C */
    AX &= F250_MT_FRAME_AGGREGATE_UNKNOWN_BIT;                             /* 131:0x8249F 160:= com1:=; 0x8249F */
    DX |= AX;                                 /* 131:0x824A2 160:= com1:=; 0x824A2 */
    if (DX == 0)                             /* 131:0x824A4 160:= com1:=; 0x824A4 */
        goto guard_824A9;
    goto rejected_8261B;                      /* 131:0x824A6 160:= com1:=; 0x824A6 */

guard_824A9:
    SADDR();                                  /* 131:0x824A9,0x824B4 160:= com1:=; 0x824A9–0x824B4: reload */
    if (B(ES_BX, F250_MT_SPELL_REALM) != F250_MT_REALM_SORCERY)                  /* 131:0x824B6,0x824BB 160:= com1:=; 0x824B6, 0x824BB */
        goto accepted_824D5;

    BADDR();                                  /* 131:0x824BD,0x824C8 160:= com1:=; 0x824BD–0x824C8 */
    if ((W(ES_BX, F250_MT_BU_ATTRIBS1) & USA_IMMUNITY_ILLUSION) == 0)       /* 131:0x824CA,0x824D0 160:= com1:=; 0x824CA, 0x824D0 */
        goto accepted_824D5;
    goto rejected_8261B;                      /* 131:0x824D2 160:= com1:=; 0x824D2 */

accepted_824D5:
    CALL6();                                  /* 131:0x824D5..0x824EA 160:= com1:=; pushes 0x824D5–0x824E2;
                                                 call 0x824E5;
                                                 cleanup 0x824EA */

    /* All subsequent state is the opaque call's returned state. */
    BADDR();                                  /* 131:0x824ED,0x824F8 160:= com1:=; 0x824ED–0x824F8 */
    AX = W(ES_BX, F250_MT_BU_COMBAT_EFFECTS);                       /* 131:0x824FA 160:= com1:=; 0x824FA */
    push16(AX);                               /* 131:0x824FE 160:= com1:=; 0x824FE */

    SADDR();                                  /* 131:0x824FF,0x8250A 160:= com1:=; 0x824FF–0x8250A */
    AX = pop16();                             /* 131:0x8250C 160:= com1:=; 0x8250C */
    AX |= W(ES_BX, F250_MT_SPELL_EFFECT_WORD);                      /* 131:0x8250D 160:= com1:=; 0x8250D */
    push16(AX);                               /* 131:0x82511 160:= com1:=; 0x82511 */

    BADDR();                                  /* 131:0x82512,0x8251D 160:= com1:=; 0x82512–0x8251D: reload */
    AX = pop16();                             /* 131:0x8251F 160:= com1:=; 0x8251F */
    W(ES_BX, F250_MT_BU_COMBAT_EFFECTS) = AX;                       /* 131:0x82520 160:= com1:=; 0x82520 */

    if (DI != F250_MT_SPECIAL_INDEX_5)                         /* 131:0x82524,0x82527 160:= com1:=; 0x82524, 0x82527 */
        goto accepted_calls_82560;

    BADDR();                                  /* 131:0x82529,0x82534 160:= com1:=; 0x82529–0x82534 */
    B(ES_BX, F250_MT_BU_UNKNOWN_33) = F250_MT_UNKNOWN_33_VALUE;                    /* 131:0x82536 160:= com1:=; 0x82536 */

    BADDR();                                  /* 131:0x8253B,0x82546 160:= com1:=; 0x8253B–0x82546: reload */
    W(ES_BX, F250_MT_BU_UNKNOWN_54) = F250_MT_UNKNOWN_54_VALUE;                  /* 131:0x82548 160:= com1:=; 0x82548 */

    BADDR();                                  /* 131:0x8254E,0x82559 160:= com1:=; 0x8254E–0x82559: reload */
    B(ES_BX, F250_MT_BU_UNKNOWN_07) = 0;                       /* 131:0x8255B 160:= com1:=; 0x8255B */

accepted_calls_82560:
    opaque_far_call(0x00E0, 0x001A);           /* 131:0x82560 160:= com1:=; 0x82560 */
    opaque_far_call(0x0318, 0x0020);           /* 131:0x82565 160:= com1:=; 0x82565 */
    opaque_far_call(0x0008, 0x0503);           /* 131:0x8256A 160:= com1:=; 0x8256A */

    if (BUILD == COM1)
        goto exit_8262A;                      /* 131:— 160:— com1:0x8256F; 0x8256F: E9 B8 00 */

    goto tail14_8256F;                        /* 131/160 fall-through */

rejected_8261B:
    opaque_far_call(0x00E0, 0x001A);           /* 131:0x8261B 160:= com1:=; 0x8261B */
    opaque_far_call(0x0318, 0x0020);           /* 131:0x82620 160:= com1:=; 0x82620 */
    opaque_far_call(0x0008, 0x0503);           /* 131:0x82625 160:= com1:=; 0x82625 */

exit_8262A:
    goto external_82F61;                      /* 131:0x8262A 160:= com1:=; 0x8262A */

class1_15_8262D:
    CALL6();                                  /* 131:0x8262D..0x82642 160:= com1:=; pushes 0x8262D–0x8263A;
                                                 call 0x8263D;
                                                 cleanup 0x82642 */

    /* DI and all addressing state below are post-call values. */
    if (BUILD == COM1) {
        if (DI != F250_MT_SPECIAL_INDEX_COM1)                     /* 131:— 160:— com1:0x82645,0x82648; 0x82645, 0x82648 */
            goto ordinary_com1_8266B;

        BADDR();                              /* 131:— 160:— com1:0x8264A,0x82655; 0x8264A–0x82655 */
        W(ES_BX, F250_MT_BU_COMBAT_EFFECTS) |= F250_MT_COMBAT_EFFECT_UNKNOWN_0800;             /* 131:— 160:— com1:0x82657; 0x82657 */
        /* 131:— 160:— com1:0x8265D,0x82669; Twelve NOPs: [0x8265D,0x82669). */
        goto calls_826BA;                     /* 131:— 160:— com1:0x82669; 0x82669 */

ordinary_com1_8266B:
        BADDR();                              /* 131:— 160:— com1:0x8266B,0x82676; 0x8266B–0x82676 */
        if (DI != F250_MT_NEARCALL_INDEX_COM1)                     /* 131:— 160:— com1:0x82678,0x8267B; 0x82678, 0x8267B */
            goto ordinary_read_82680;

        opaque_near_call(0x80DEF);            /* 131:— 160:— com1:0x8267D; 0x8267D: E8 6F E7 */

        /* No source-pointer reload follows this call.
           ES:BX, DI, SI, DS, SS, BP, SP, and memory below
           are the returned state, with no preservation assumed. */
        goto ordinary_read_82680;            /* fall-through */
    }

    /* 131 and 160 */
    if (DI != F250_MT_SPECIAL_INDEX_131_160)                         /* 131:0x82645,0x82648 160:= com1:—; 0x82645, 0x82648 */
        goto ordinary_old_82673;

    BADDR();                                  /* 131:0x8264A,0x82655 160:= com1:—; 0x8264A–0x82655 */

    if (BUILD == V131) {
        AX = W(ES_BX, F250_MT_BU_COMBAT_EFFECTS);                  /* 131:0x82657 160:— com1:—; 0x82657 */
        AX |= F250_MT_COMBAT_EFFECT_UNKNOWN_0800;                        /* 131:0x8265B 160:— com1:—; 0x8265B */
        push16(AX);                          /* 131:0x8265E 160:— com1:—; 0x8265E */

        BADDR();                              /* 131:0x8265F,0x8266A 160:— com1:—; 0x8265F–0x8266A: reload */
        AX = pop16();                        /* 131:0x8266C 160:— com1:—; 0x8266C */
        W(ES_BX, F250_MT_BU_COMBAT_EFFECTS) = AX;                  /* 131:0x8266D 160:— com1:—; 0x8266D */
    } else { /* V160 */
        W(ES_BX, F250_MT_BU_COMBAT_EFFECTS) |= F250_MT_COMBAT_EFFECT_UNKNOWN_0800;             /* 131:— 160:0x82657 com1:—; 0x82657 */
        B(ES_BX, F250_MT_BU_UNKNOWN_07) =
            u8(B(ES_BX, F250_MT_BU_UNKNOWN_07) << 1);          /* 131:— 160:0x8265D com1:—; 0x8265D */
        /* Same ES:BX for OR and SHL; no intervening reload.
           Sixteen NOPs: [0x82661,0x82671). */
    }
    goto calls_826BA;                         /* 131:0x82671 160:= com1:—; 0x82671 */

ordinary_old_82673:
    BADDR();                                  /* 131:0x82673,0x8267E 160:= com1:—; 0x82673–0x8267E */

ordinary_read_82680:
    AX = W(ES_BX, F250_MT_BU_ENCHANTMENTS_HI);                       /* 131:0x82680 160:= com1:=; 0x82680 */
    DX = W(ES_BX, F250_MT_BU_ENCHANTMENTS_LO);                       /* 131:0x82684 160:= com1:=; 0x82684 */
    push16(AX);                               /* 131:0x82688 160:= com1:=; 0x82688: source +3C */

    AX = DI;                                  /* 131:0x82689 160:= com1:=; 0x82689 */
    BX = F250_MT_SPELL_STRIDE;                              /* 131:0x8268B 160:= com1:=; 0x8268B */
    push16(DX);                               /* 131:0x8268E 160:= com1:=; 0x8268E: source +3A */
    DX_AX = s16(AX) * s16(BX);                /* 131:0x8268F 160:= com1:=; 0x8268F */
    ES_BX = far_pointer_at_current_DS(F250_MT_SPELL_POINTER_DS); /* 131:0x82691 160:= com1:=; 0x82691 */
    BX = u16(BX + AX);                        /* 131:0x82695 160:= com1:=; 0x82695 */

    AX = pop16();                             /* 131:0x82697 160:= com1:=; 0x82697: source +3A */
    AX |= W(ES_BX, F250_MT_SPELL_EFFECT_WORD);                      /* 131:0x82698 160:= com1:=; 0x82698 */
    DX = pop16();                             /* 131:0x8269C 160:= com1:=; 0x8269C: source +3C */
    DX |= W(ES_BX, F250_MT_SPELL_EFFECT_HI);                      /* 131:0x8269D 160:= com1:=; 0x8269D */

    push16(AX);                               /* 131:0x826A1 160:= com1:=; 0x826A1: result for +3A */
    AX = SI;                                  /* 131:0x826A2 160:= com1:=; 0x826A2 */
    BX = F250_MT_BATTLE_STRIDE;                              /* 131:0x826A4 160:= com1:=; 0x826A4 */
    push16(DX);                               /* 131:0x826A7 160:= com1:=; 0x826A7: result for +3C */
    DX_AX = s16(AX) * s16(BX);                /* 131:0x826A8 160:= com1:=; 0x826A8 */
    ES_BX = far_pointer_at_current_DS(F250_MT_BATTLE_POINTER_DS); /* 131:0x826AA 160:= com1:=; 0x826AA */
    BX = u16(BX + AX);                        /* 131:0x826AE 160:= com1:=; 0x826AE */

    AX = pop16();                             /* 131:0x826B0 160:= com1:=; 0x826B0: result for +3C */
    W(ES_BX, F250_MT_BU_ENCHANTMENTS_HI) = AX;                       /* 131:0x826B1 160:= com1:=; 0x826B1: FIRST store */
    AX = pop16();                             /* 131:0x826B5 160:= com1:=; 0x826B5: result for +3A */
    W(ES_BX, F250_MT_BU_ENCHANTMENTS_LO) = AX;                       /* 131:0x826B6 160:= com1:=; 0x826B6: SECOND store */

calls_826BA:
    opaque_far_call(0x00E0, 0x001A);           /* 131:0x826BA 160:= com1:=; 0x826BA */
    opaque_far_call(0x0318, 0x0020);           /* 131:0x826BF 160:= com1:=; 0x826BF */
    opaque_far_call(0x0008, 0x0503);           /* 131:0x826C4 160:= com1:=; 0x826C4 */

    if (BUILD == COM1)
        goto external_82F61;                 /* 131:— 160:— com1:0x826C9; 0x826C9: E9 95 08 */

    goto tail1_15_826C9;                      /* 131/160 fall-through */

tail14_8256F:
tail1_15_826C9:
    push16(SI);                               /* 131:0x8256F,0x826C9 160:= com1:—; 0x8256F / 0x826C9 */
    opaque_far_call(0x03E0, 0x003E);           /* 131:0x82570,0x826CA 160:= com1:—; 0x82570 / 0x826CA */
    CX = pop16();                             /* 131:0x82575,0x826CF 160:= com1:—; 0x82575 / 0x826CF */
    L(-0x16) = AX;                            /* 131:0x82576,0x826D0 160:= com1:—; 0x82576 / 0x826D0 */
    L(-0x18) = 0;                             /* 131:0x82579,0x826D3 160:= com1:—; 0x82579 / 0x826D3 */

    BADDR();                                  /* 131:0x8257E,0x82589,0x826D8,0x826E3 160:= com1:—; 0x8257E–0x82589 / 0x826D8–0x826E3 */
    AL = B(ES_BX, F250_MT_BU_UNKNOWN_07);                      /* 131:0x8258B,0x826E5 160:= com1:—; 0x8258B / 0x826E5 */
    AX = sx8(AL);                             /* 131:0x8258F,0x826E9 160:= com1:—; 0x8258F / 0x826E9 */
    if (AX != L(-0x16))                       /* 131:0x82590,0x82593,0x826EA,0x826ED 160:= com1:—; 0x82590,0x82593 / 0x826EA,0x826ED */
        goto unequal;

    L(-0x18) = 1;                             /* 131:0x82595,0x826EF 160:= com1:—; 0x82595 / 0x826EF */
    goto pointer_calls;                       /* 131:0x8259A,0x826F4 160:= com1:—; 0x8259A / 0x826F4 */

unequal:
    BADDR();                                  /* 131:0x8259C,0x825A7,0x826F6,0x82701 160:= com1:—; 0x8259C–0x825A7 / 0x826F6–0x82701 */
    AL = B(ES_BX, F250_MT_BU_UNKNOWN_07);                      /* 131:0x825A9,0x82703 160:= com1:—; 0x825A9 / 0x82703: fresh read */
    AX = sx8(AL);                             /* 131:0x825AD,0x82707 160:= com1:—; 0x825AD / 0x82707 */
    L(-0x16) = AX;                            /* 131:0x825AE,0x82708 160:= com1:—; 0x825AE / 0x82708 */

pointer_calls:
    BARG();                                   /* 131:0x825B1,0x825C2,0x8270B,0x8271C 160:= com1:—; 0x825B1–0x825C2 / 0x8270B–0x8271C */
    opaque_far_call(0x03A0, 0x003E);           /* 131:0x825C3,0x8271D 160:= com1:—; 0x825C3 / 0x8271D */
    CX = pop16();                             /* 131:0x825C8,0x82722 160:= com1:—; 0x825C8 / 0x82722 */
    CX = pop16();                             /* 131:0x825C9,0x82723 160:= com1:—; 0x825C9 / 0x82723 */

    BARG();                                   /* 131:0x825CA..0x825DB,0x82724..0x82735 160:= com1:—;
                                                 fresh post-call addressing */
    opaque_far_call(0x03A0, 0x0052);           /* 131:0x825DC,0x82736 160:= com1:—; 0x825DC / 0x82736 */
    CX = pop16();                             /* 131:0x825E1,0x8273B 160:= com1:—; 0x825E1 / 0x8273B */
    CX = pop16();                             /* 131:0x825E2,0x8273C 160:= com1:—; 0x825E2 / 0x8273C */

    if (TAIL == CLASS1_15)
        L(-0x18) = 0;                         /* 131:0x8273D 160:= com1:—; 0x8273D only */

    if (L(-0x18) != 1)                        /* 131:0x825E3,0x825E7,0x82742,0x82746 160:= com1:—; 0x825E3,0x825E7 / 0x82742,0x82746 */
        goto frame_byte;

    push16(SI);                               /* 131:0x825E9,0x82748 160:= com1:—; 0x825E9 / 0x82748 */
    opaque_far_call(0x03E0, 0x003E);           /* 131:0x825EA,0x82749 160:= com1:—; 0x825EA / 0x82749 */
    CX = pop16();                             /* 131:0x825EF,0x8274E 160:= com1:—; 0x825EF / 0x8274E */
    push16(AX);                               /* 131:0x825F0,0x8274F 160:= com1:—; 0x825F0 / 0x8274F */

    BADDR();                                  /* 131:0x825F1,0x825FC,0x82750,0x8275B 160:= com1:—; 0x825F1–0x825FC / 0x82750–0x8275B */
    AX = pop16();                             /* 131:0x825FE,0x8275D 160:= com1:—; 0x825FE / 0x8275D */
    B(ES_BX, F250_MT_BU_UNKNOWN_07) = u8(AX);                  /* 131:0x825FF,0x8275E 160:= com1:—; 0x825FF / 0x8275E */
    goto tail_done;                           /* 131:0x82603,0x82762 160:= com1:—; 0x82603 / 0x82762 */

frame_byte:
    BADDR();                                  /* 131:0x82605,0x82610,0x82764,0x8276F 160:= com1:—; 0x82605–0x82610 / 0x82764–0x8276F */
    AL = LB(-0x16);                           /* 131:0x82612,0x82771 160:= com1:—; 0x82612 / 0x82771 */
    B(ES_BX, F250_MT_BU_UNKNOWN_07) = AL;                      /* 131:0x82615,0x82774 160:= com1:—; 0x82615 / 0x82774 */

tail_done:
    if (TAIL == CLASS14)
        goto exit_8262A;                      /* 131:0x82619,0x8262A 160:= com1:—; 0x82619, then 0x8262A */
    goto external_82F61;                      /* 131:0x82778 160:= com1:—; class1/15: 0x82778 */

external_82F61:
    /* 131:0x82F61 160:= com1:=; boundary only, no return instruction reconstructed here. */
    return;
}
#undef BADDR
#undef SADDR
#undef BARG
#undef CALL6

/* =====================================================================================
 * F250.3 Warp Creature: class-5 route, id89 caller and resolved overlay-133 writer.
 * F250.3.warp.evidence.md owns scope, raw-byte provenance and existing-callee joins.
 * C-shaped machine notation, not a callable ABI or standalone compilable implementation.
 * AX/AL, SI, DI, ES:BX and L/DS memory are live after every opaque call; PUSH/POP and
 * far/near calls have machine stack effects. Address offsets wrap to 16 bits without
 * carrying into segment words. BUILD selects a transcription, not a runtime engine test.
 * Existing F250_MT layout constants are shared below; no second record-layout definition.
 * BUE names match unitcalc.c; local definitions retain raw masks for this source artifact.
 * ===================================================================================== */
#define BUE_WARPED_ATTACK   0x0080
#define BUE_WARPED_DEFENSE  0x0100
#define BUE_WARPED_RESIST   0x0200
#define F250_W_SPELL_INDEX  0x0059
#define F250_W_SKIP_131     0x0003
#define F250_W_SKIP_COM1    0x0044
#define F250_W_SKIP_137     0x0089
#define F250_W_SKIP_195     0x00C3
#define F250_W_SIBLING_204  0x00CC
#define F250_W_SIBLING_148  0x0094
#define F250_W_SIBLING_81   0x0051
#define F250_W_SIBLING_125  0x007D
#define F250_W_SIBLING_73   0x0049
#define F250_W_RETRY_ATTACK 0xFFFF
#define F250_W_RETRY_DEFENSE 0xFFFE
#define F250_W_RETRY_RESIST 0xFFFD
#define F250_W_DRAW_FIRST   1
#define F250_W_DRAW_SECOND  2
#define F250_W_DRAW_THIRD   3
/* Encoded call operands, resolved independently in the raw packet. */
#define F250_W_CALL_COMMON      0x0418, 0x0043
#define F250_W_CALL_COPY_SETUP  0x0000, 0x0787
#define F250_W_CALL_RESISTANCE  0x03D0, 0x002A
#define F250_W_CALL_WRITER      0x0428, 0x002A
#define F250_W_CALL_DRAW        0x00B0, 0x00D8
#define F250_W_CALL_BYTE07      0x03E0, 0x003E
#define F250_W_CALL_CONSTRUCT   0x03A0, 0x003E
#define F250_W_CALL_BATTLEFIELD 0x03A0, 0x0052
/* Inline instruction expansions: not additional game calls. IMUL writes DX:AX. */
#define WARP_MUL(index, stride) do { AX=(index); DX=(stride); DX_AX=s16(AX)*s16(DX); } while (0)
#define WARP_ADDR() do { WARP_MUL(SI,F250_MT_BATTLE_STRIDE); \
    ES_BX=far_pointer_at_current_DS(F250_MT_BATTLE_POINTER_DS); BX=u16(BX+AX); } while (0)
#define WARP_ARG() do { WARP_MUL(SI,F250_MT_BATTLE_STRIDE); \
    DX=DS_word(F250_MT_BATTLE_POINTER_DS); DX=u16(DX+AX); \
    push16(DS_word(F250_MT_BATTLE_SEGMENT_DS)); push16(DX); } while (0)

static void F250_W_class5_fragment_notation(void)
{
    if (DI != (BUILD == COM1 ? F250_W_SKIP_COM1 : F250_W_SKIP_131) &&
        DI != F250_W_SKIP_137 && DI != F250_W_SKIP_195) { /* 131:0x82B84,0x82B89,0x82B8F 160:= com1:= */
        push16(L(+0x0A));                      /* 131:0x82B95 160:= com1:= */
        push16(L(+0x12));                      /* 131:0x82B98 160:= com1:= */
        push16(L(-0x06));                      /* 131:0x82B9B 160:= com1:= */
        push16(DI);                            /* 131:0x82B9E 160:= com1:= */
        push16(L(+0x0E));                      /* 131:0x82B9F 160:= com1:= */
        push16(L(+0x0C));                      /* 131:0x82BA2 160:= com1:= */
        opaque_far_call(F250_W_CALL_COMMON);   /* 131:0x82BA5 160:= com1:= */
        SP=u16(SP+12);                         /* 131:0x82BAA 160:= com1:= */
    }
    if (DI == (BUILD == COM1 ? F250_W_SKIP_COM1 : F250_W_SKIP_131))
        goto external_82BB2;                  /* 131:0x82BAD 160:= com1:= */
#if BUILD == COM1
    if (DI == F250_W_SIBLING_204) goto external_82BBB; /* 131:— 160:— com1:0x82BB5 */
    if (DI == F250_W_SIBLING_148) goto external_82BC6; /* 131:— 160:— com1:0x82BC0 */
    if (DI == F250_W_SIBLING_81) goto external_82BD5;  /* 131:— 160:— com1:0x82BCD */
#else
    if (DI == F250_W_SIBLING_81) goto external_82BC8;  /* 131:0x82BC0 160:= com1:— */
#endif
    if (DI == F250_W_SIBLING_125) goto external_82C9B; /* 131:0x82C96 160:= com1:= */
    if (DI == F250_W_SIBLING_73) goto external_82CB3;  /* 131:0x82CAB 160:= com1:= */
    /* The supplied false edges reach the local id89 head. Excluded sibling labels
     * terminate this fragment, not the game function; they are not reconstructed no-ops. */
    if (DI != F250_W_SPELL_INDEX) goto external_82E53; /* 131:0x82D59,0x82D5E 160:= com1:= */
    WARP_MUL(DI,F250_MT_SPELL_STRIDE);          /* 131:0x82D61 160:= com1:= */
    ES_BX=far_pointer_at_current_DS(F250_MT_SPELL_POINTER_DS); /* 131:0x82D68 160:= com1:= */
    BX=u16(BX+AX);                             /* 131:0x82D6C 160:= com1:= */
    AL=B(ES_BX,F250_MT_SPELL_REALM);           /* 131:0x82D6E 160:= com1:= */
    AX=s16(s8(AL));                            /* 131:0x82D72 160:= com1:= */
    push16(AX);                               /* 131:0x82D73 160:= com1:= */
    push16(L(-0x0A));                         /* 131:0x82D74 160:= com1:= */
    WARP_MUL(SI,F250_MT_BATTLE_STRIDE);         /* 131:0x82D77 160:= com1:= */
    DX=DS_word(F250_MT_BATTLE_SEGMENT_DS);      /* 131:0x82D7E 160:= com1:= */
    push16(AX);                               /* 131:0x82D82 160:= com1:= */
    AX=DS_word(F250_MT_BATTLE_POINTER_DS);      /* 131:0x82D83 160:= com1:= */
    BX=pop16();                               /* 131:0x82D86 160:= com1:= */
    AX=u16(AX+BX);                            /* 131:0x82D87 160:= com1:= */
    CX=F250_MT_BATTLE_STRIDE;                  /* 131:0x82D89 160:= com1:= */
    opaque_far_call(F250_W_CALL_COPY_SETUP);   /* 131:0x82D8C 160:= com1:= */
    opaque_far_call(F250_W_CALL_RESISTANCE);   /* 131:0x82D91 160:= com1:= */
    SP=u16(SP+F250_MT_BATTLE_STRIDE+4);         /* 131:0x82D96 160:= com1:=; raw cleanup0x72 */
    L(-2)=AX;                                 /* 131:0x82D99 160:= com1:= */
    if (s16(L(-2)) > 0) {                     /* 131:0x82D9C,0x82DA0 160:= com1:= */
        push16(SI);                           /* 131:0x82DA2 160:= com1:= */
        far_call(F250_W_CALL_WRITER);          /* 131:0x82DA3 160:= com1:=; body below, resolved0xAE020 */
        CX=pop16();                           /* 131:0x82DA8 160:= com1:= */
    }
#if BUILD == COM1
    goto external_82E53;                      /* 131:— 160:— com1:0x82DA9 */
#else
    push16(SI);                               /* 131:0x82DA9 160:= com1:— */
    opaque_far_call(F250_W_CALL_BYTE07);       /* 131:0x82DAA 160:= com1:— */
    CX=pop16();                               /* 131:0x82DAF 160:= com1:— */
    L(-0x16)=AX;                              /* 131:0x82DB0 160:= com1:— */
    L(-0x18)=0;                               /* 131:0x82DB3 160:= com1:— */
    WARP_ADDR();                              /* 131:0x82DB8 160:= com1:— */
    AL=B(ES_BX,F250_MT_BU_UNKNOWN_07);         /* 131:0x82DC5 160:= com1:— */
    AX=s16(s8(AL));                            /* 131:0x82DC9 160:= com1:— */
    if (AX == L(-0x16)) {                     /* 131:0x82DCA,0x82DCD 160:= com1:— */
        L(-0x18)=1;                           /* 131:0x82DCF 160:= com1:— */
    } else {
        WARP_ADDR();                          /* 131:0x82DD6 160:= com1:— */
        AL=B(ES_BX,F250_MT_BU_UNKNOWN_07);     /* 131:0x82DE3 160:= com1:— */
        AX=s16(s8(AL));                        /* 131:0x82DE7 160:= com1:— */
        L(-0x16)=AX;                          /* 131:0x82DE8 160:= com1:— */
    }
    WARP_ARG();                               /* 131:0x82DEB 160:= com1:— */
    opaque_far_call(F250_W_CALL_CONSTRUCT);    /* 131:0x82DFD 160:= com1:—; existing BU_Construct0x8EDFD */
    CX=pop16(); CX=pop16();                    /* 131:0x82E02,0x82E03 160:= com1:— */
    WARP_ARG();                               /* 131:0x82E04 160:= com1:—; recompute after call */
    opaque_far_call(F250_W_CALL_BATTLEFIELD);  /* 131:0x82E16 160:= com1:—; existing battlefield0x8FF09 */
    CX=pop16(); CX=pop16();                    /* 131:0x82E1B,0x82E1C 160:= com1:— */
    if (L(-0x18) == 1) {                      /* 131:0x82E1D,0x82E21 160:= com1:— */
        push16(SI);                           /* 131:0x82E23 160:= com1:— */
        opaque_far_call(F250_W_CALL_BYTE07);   /* 131:0x82E24 160:= com1:— */
        CX=pop16();                           /* 131:0x82E29 160:= com1:— */
        push16(AX);                           /* 131:0x82E2A 160:= com1:— */
        WARP_ADDR();                          /* 131:0x82E2B 160:= com1:— */
        AX=pop16();                           /* 131:0x82E38 160:= com1:— */
        B(ES_BX,F250_MT_BU_UNKNOWN_07)=AL;     /* 131:0x82E39 160:= com1:— */
    } else {
        WARP_ADDR();                          /* 131:0x82E3F 160:= com1:— */
        AL=LB(-0x16);                        /* 131:0x82E4C 160:= com1:— */
        B(ES_BX,F250_MT_BU_UNKNOWN_07)=AL;     /* 131:0x82E4F 160:= com1:— */
    }
    goto external_82E53;                      /* 131:0x82E3D / fall-through0x82E53 160:= com1:— */
#endif
    /* External labels above name fragment boundaries, not local return instructions. */
}

/* Real writer entry. Local near wrapper is inlined only as a notation definition below. */
static void F250_W_writer_notation(void)
{
    push16(BP); BP=SP; push16(SI); push16(DI);  /* 131:0xAE020..0xAE024 160:= com1:= */
#if BUILD == MOM131
    SI=L(+6);                                 /* 131:0xAE025 160:— com1:— */
    DI=F250_W_RETRY_DEFENSE;                   /* 131:0xAE028 160:— com1:— */
    goto retry_test;                          /* 131:0xAE02B 160:— com1:— */
retry:
    AX=3; push16(AX);                         /* 131:0xAE02E,0xAE031 160:— com1:— */
    opaque_far_call(F250_W_CALL_DRAW);         /* 131:0xAE032 160:— com1:— */
    CX=pop16(); DI=AX; AX=DI;                  /* 131:0xAE037..0xAE03A 160:— com1:— */
    if (AX == F250_W_DRAW_FIRST) {                            /* 131:0xAE03C,0xAE03F 160:— com1:— */
        WARP_ADDR();                          /* 131:0xAE051 160:— com1:— */
        if (W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_ATTACK) /* 131:0xAE05E,0xAE064 160:— com1:— */
            DI=F250_W_RETRY_ATTACK;           /* 131:0xAE066 160:— com1:— */
        else {
            WARP_ADDR();                      /* 131:0xAE06B 160:— com1:— */
            AX=W(ES_BX,F250_MT_BU_COMBAT_EFFECTS); /* 131:0xAE078 160:— com1:— */
            AX|=BUE_WARPED_ATTACK; push16(AX); /* 131:0xAE07C,0xAE07F 160:— com1:— */
            WARP_ADDR(); AX=pop16();          /* 131:0xAE080,0xAE08D 160:— com1:— */
            W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)=AX; /* 131:0xAE08E 160:— com1:— */
        }
        goto retry_test;                      /* 131:0xAE069,0xAE092 160:— com1:— */
    }
    if (AX == F250_W_DRAW_SECOND) {                            /* 131:0xAE041,0xAE044 160:— com1:— */
        WARP_ADDR();                          /* 131:0xAE095 160:— com1:— */
        if (W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_DEFENSE) /* 131:0xAE0A2,0xAE0A8 160:— com1:— */
            DI=F250_W_RETRY_DEFENSE;          /* 131:0xAE0AA 160:— com1:— */
        else {
            WARP_ADDR();                      /* 131:0xAE0AF 160:— com1:— */
            AX=W(ES_BX,F250_MT_BU_COMBAT_EFFECTS); /* 131:0xAE0BC 160:— com1:— */
            AX|=BUE_WARPED_DEFENSE; push16(AX); /* 131:0xAE0C0,0xAE0C3 160:— com1:— */
            WARP_ADDR(); AX=pop16();          /* 131:0xAE0C4,0xAE0D1 160:— com1:— */
            W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)=AX; /* 131:0xAE0D2 160:— com1:— */
        }
        goto retry_test;                      /* 131:0xAE0AD,0xAE0D6 160:— com1:— */
    }
    if (AX == F250_W_DRAW_THIRD) {                            /* 131:0xAE046,0xAE049,0xAE04B 160:— com1:— */
        WARP_ADDR();                          /* 131:0xAE0D8 160:— com1:— */
        if (W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_RESIST) /* 131:0xAE0E5,0xAE0EB 160:— com1:— */
            DI=F250_W_RETRY_RESIST;           /* 131:0xAE0ED 160:— com1:— */
        else {
            WARP_ADDR();                      /* 131:0xAE0F2 160:— com1:— */
            AX=W(ES_BX,F250_MT_BU_COMBAT_EFFECTS); /* 131:0xAE0FF 160:— com1:— */
            AX|=BUE_WARPED_RESIST; push16(AX); /* 131:0xAE103,0xAE106 160:— com1:— */
            WARP_ADDR(); AX=pop16();          /* 131:0xAE107,0xAE114 160:— com1:— */
            W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)=AX; /* 131:0xAE115 160:— com1:— */
        }
    }
    /* Other results reach the same test without a local store: 131:0xAE04E 160:— com1:— */
retry_test:
    if (s16(DI) < 0) goto retry;              /* 131:0xAE11B,0xAE11D,0xAE11F 160:— com1:— */
#else
    /* Eight executed NOPs replace stack load/initial retry marker. Entry SI is used.
       131:— 160:0xAE025..0xAE02D com1:0xAE025..0xAE02D; jump skips near wrapper. */
    WARP_ADDR();                              /* 131:— 160:0xAE03B com1:0xAE03B */
    AX=3;                                    /* 131:— 160:0xAE048 com1:0xAE048 */
    near_call(F250_W_draw_wrapper_notation);   /* 131:— 160:0xAE04B com1:0xAE04B */
    if (AX == F250_W_DRAW_FIRST && !(W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_ATTACK)) { /* 131:— 160:0xAE04E,0xAE053 com1:0xAE04E,0xAE053 */
        W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)|=BUE_WARPED_ATTACK; /* 131:— 160:0xAE05B com1:0xAE05B */
        goto patched_done;                    /* 131:— 160:0xAE061 com1:0xAE061 */
    }
    AX=2;                                    /* 131:— 160:0xAE063 com1:0xAE063 */
    near_call(F250_W_draw_wrapper_notation);   /* 131:— 160:0xAE066 com1:0xAE066 */
    if (AX == F250_W_DRAW_FIRST && !(W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_DEFENSE)) { /* 131:— 160:0xAE069,0xAE06E com1:0xAE069,0xAE06E */
        W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)|=BUE_WARPED_DEFENSE; /* 131:— 160:0xAE076 com1:0xAE076 */
        goto patched_done;                    /* 131:— 160:0xAE07C com1:0xAE07C */
    }
    if (!(W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_RESIST)) { /* 131:— 160:0xAE07E com1:0xAE07E */
        W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)|=BUE_WARPED_RESIST; /* 131:— 160:0xAE086 com1:0xAE086 */
        goto patched_done;                    /* 131:— 160:0xAE08C com1:0xAE08C */
    }
    AX=2;                                    /* 131:— 160:0xAE08E com1:0xAE08E */
    near_call(F250_W_draw_wrapper_notation);   /* 131:— 160:0xAE091 com1:0xAE091 */
    if (AX == F250_W_DRAW_FIRST && !(W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_DEFENSE)) /* 131:— 160:0xAE094,0xAE099 com1:0xAE094,0xAE099 */
        goto set_defense;                    /* 131:— 160:0xAE09F com1:0xAE09F */
    if (W(ES_BX,F250_MT_BU_COMBAT_EFFECTS) & BUE_WARPED_ATTACK) /* 131:— 160:0xAE0A9 com1:0xAE0A9 */
        goto set_defense;                    /* 131:— 160:0xAE0AF com1:0xAE0AF */
    W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)|=BUE_WARPED_ATTACK; /* 131:— 160:0xAE0B1 com1:0xAE0B1 */
    goto patched_done;                        /* presentation edge: binary falls through0xAE0B7 */
set_defense:
    W(ES_BX,F250_MT_BU_COMBAT_EFFECTS)|=BUE_WARPED_DEFENSE; /* 131:— 160:0xAE0A1 com1:0xAE0A1 */
    goto patched_done;                        /* 131:— 160:0xAE0A7 com1:0xAE0A7 */
patched_done:
    /* CP1.60 executes107 NOPs before epilogue; CoM1 returns earlier.
       131:— 160:0xAE0B7..0xAE122 com1:— */
#endif
    DI=pop16(); SI=pop16(); BP=pop16();        /* 131:0xAE122..0xAE124 160:= com1:0xAE0B7..0xAE0B9 */
    far_return();                             /* 131:0xAE125 160:= com1:0xAE0BA */
}
#if BUILD == CP160 || BUILD == COM1
static void F250_W_draw_wrapper_notation(void)
{
    push16(ES); push16(BX); push16(AX);        /* 131:— 160:0xAE02F..0xAE031 com1:0xAE02F..0xAE031 */
    opaque_far_call(F250_W_CALL_DRAW);         /* 131:— 160:0xAE032 com1:0xAE032 */
    CX=pop16(); BX=pop16(); ES=pop16();        /* 131:— 160:0xAE037..0xAE039 com1:0xAE037..0xAE039 */
    near_return();                            /* 131:— 160:0xAE03A com1:0xAE03A */
}
#endif
#undef WARP_MUL
#undef WARP_ADDR
#undef WARP_ARG
