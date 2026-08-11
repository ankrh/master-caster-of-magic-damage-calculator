/* Source-shaped DOS SPELLDAT.LBX records. D22.evidence.md owns byte coverage and the
 * executable-to-table binding; README.md owns the corpus conventions.
 *
 * Landed so far: D22 Fireball record 96 for MoM 1.31 and CP 1.60.
 */

#include <stddef.h>
#include <stdint.h>
#include "MOM_DAT.h"

/* Direct-damage payload symbols; raw values remain visible at the definition site. */
#define USA_IMMUNITY_FIRE       0x01
#define USA_IMMUNITY_MAGIC      0x20
#define ATT_AREA                0x1000
#define FIREBALL_IMMUNITIES     (USA_IMMUNITY_FIRE | USA_IMMUNITY_MAGIC) /* raw 0x21 */
#define FIREBALL_ATTRIBUTES     ATT_AREA                                 /* raw 0x1000 */

/* Fireball's remaining fixed record values. */
#define FIREBALL_AI_VALUE       0x00
#define FIREBALL_BOOK_CATEGORY  0x05
#define FIREBALL_ELIGIBILITY    (-1) /* raw 0xFF; category meaning not established by D22 */
#define FIREBALL_CASTING_COST   15
#define FIREBALL_RESEARCH_COST  560
#define FIREBALL_SOUND_ID       0x5D

/* These existing MOM_DAT.h categories retain their raw table values here. */
_Static_assert(scc_Direct_Damage_Variable == 0x16, "Fireball casting category");
_Static_assert(sbr_Chaos == 0x02, "Fireball realm");
_Static_assert(sizeof(struct s_SPELL_DATA) == 0x24, "SPELLDAT record stride");
_Static_assert(offsetof(struct s_SPELL_DATA, strength) == 0x20, "strength offset");

#ifndef BUILD
#error BUILD must select MOM131 or CP160 for D22's Fireball record
#elif BUILD == MOM131
#define FIREBALL_AI_GROUP  0x05 /* mom131 SPELLDAT:0x0FB7; meaning not established by D22 */
#elif BUILD == CP160
#define FIREBALL_AI_GROUP  0x02 /* mom160 SPELLDAT:0x0FB7; meaning not established by D22 */
#else
#error D22 Fireball record covers only MOM131 and CP160
#endif

/* `struct s_SPELL_DATA` uses pack(2): the static initializer zeroes its alignment bytes at
 * +0x19 and +0x1F. `type` selects the direct-variable-damage union arm below. */
static const struct s_SPELL_DATA fireball = {
    .name                = "Fireball",                    /* +0x00..+0x12 */
    .AI_Group            = FIREBALL_AI_GROUP,             /* +0x13 */
    .AI_Value            = FIREBALL_AI_VALUE,             /* +0x14 */
    .type                = scc_Direct_Damage_Variable,    /* +0x15; raw 0x16 */
    .spell_book_category = FIREBALL_BOOK_CATEGORY,        /* +0x16 */
    .magic_realm         = sbr_Chaos,                     /* +0x17; raw 0x02 */
    .Eligibility         = FIREBALL_ELIGIBILITY,          /* +0x18 */
    .casting_cost        = FIREBALL_CASTING_COST,         /* +0x1A */
    .research_cost       = FIREBALL_RESEARCH_COST,        /* +0x1C */
    .Sound               = FIREBALL_SOUND_ID,             /* +0x1E */
    .strength            = 5,                             /* +0x20; SPELLDAT:0x0FC4 */
    .immunities          = FIREBALL_IMMUNITIES,            /* +0x21 */
    .attributes          = FIREBALL_ATTRIBUTES,            /* +0x22..+0x23 */
};
