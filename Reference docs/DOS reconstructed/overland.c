/* F250.3: local overland enchantment writer and supplied post-store tails.
 * MoM 1.31 / CP 1.60 / CoM 6.08; source-shaped machine notation, not executable calculator code.
 * Evidence and coverage: F250.3.overland.evidence.md; immutable raw: F250.3.overland.raw.md.
 * Only requested entry DI=131 is bound here; admission/loading remain outside this splice.
 * Existing unitcalc.c joins DS:9EC2 to _UNITS, stride0x20, enchantments+0x18,
 * type+0x05, Status+0x0B, mutations+0x17. Raw state is retained rather than
 * replacing actual reloads, stack aliasing or returned live state with cached C fields.
 */
#include <stdint.h>
#include <stdbool.h>

#define F250_OL_DS_UNITS_PTR 0x9EC2
#define F250_OL_DS_SPELLS_PTR 0x912C
#define F250_OL_UNIT_ENCH_LOW 0x18
#define F250_OL_UNIT_ENCH_HIGH 0x1A
#define F250_OL_UNIT_LEVEL 0x0C
#define F250_OL_UNIT_STATUS 0x0B
#define F250_OL_UNIT_TYPE 5
#define F250_OL_UNIT_MUTATIONS 0x17
#define F250_OL_SPELL_MASK_LOW 0x20
#define F250_OL_SPELL_MASK_HIGH 0x22
#define F250_OL_SPELL_TAIL_KIND 0x17
#define F250_OL_TYPE_ABILITIES_TABLE 0x01BA
#define F250_OL_UA_CREATEOUTPOST 0x20
#define F250_OL_UM_UNDEAD 0x20
#define F250_OL_SPELL_HEROISM 0x0082
#define F250_OL_SPELL_BLACK_CHANNELS 0x00AF
#define F250_OL_WIZARD_STRIDE 0x04C8
#define F250_OL_SPELL_STRIDE 0x0024
#define F250_OL_DS_WIZARD_COUNT 0xBD9C
#define F250_OL_DS_UNIT_COUNT 0xBD92
#define F250_OL_DS_TAIL_FLAG 0xC9F0
#define F250_OL_WIZARD_SCAN_MOM 0xA354
#define F250_OL_WIZARD_SCAN_COM1 0xA353
#define F250_OL_WIZARD_CLEAR_1 0x9F18
#define F250_OL_WIZARD_CLEAR_2 0x9F1A
#define F250_OL_WIZARD_CLEAR_3 0x9F1C
#define F250_OL_WIZARD_PUSH_1 0x9EFC
#define F250_OL_WIZARD_PUSH_2 0x9EFA
#define F250_OL_WIZARD_PUSH_3 0x9EF8
#define F250_OL_SPELL_EXIT_EXCLUDED 0x0022
#define F250_OL_SPELL_EXIT_REPLACEMENT 0x001A
#define F250_OL_NO_INDEX 0xFFFF
#define F250_OL_LOCAL_UNIT -0x0A
#define F250_OL_LOCAL_MODE -0x14
#define F250_OL_LOCAL_CANDIDATE -0x16
#define F250_OL_LOCAL_SCAN -8
#define F250_OL_LOCAL_THRESHOLD -0x32
#define F250_OL_ARG_CASTER +6
#define F250_OL_TYPE_STRIDE 0x0024
#define F250_OL_TAIL_KIND_2 2
#define F250_OL_TAIL_KIND_4 4

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;

typedef enum {
    MOM_131,
    MOM_160,
    COM1
} Build;

typedef struct Machine {
    u16 ax, bx, cx, dx, si, di, bp, sp;
    u16 cs, ds, es, ss, ip;
    void *flags;       /* Architectural flags, including undefined status. */
    void *memory;
} Machine;

/*
 * Source-shaped machine primitive contract
 *
 * r8/r16/w8/w16:
 *   Actual segmented x86 memory accesses; words are little-endian.
 *   Effective offsets below wrap to 16 bits without segment carry.
 *   Stack, frame, pointer tables and other addressed data may alias.
 *   Reads occur where written; raw file data never substitutes for them.
 *
 * Arithmetic:
 *   add16/or16/or8/xor16/shl16/inc16/dec16 return the corresponding
 *   instruction result and update architectural flags.
 *   INC/DEC preserve CF. Undefined flags remain undefined.
 *   CMP/TEST change flags only.
 *   Arithmetic primitives do not otherwise modify registers or memory.
 *
 * imul_ax:
 *   Capture source before modifying AX/DX.
 *   Compute signed16(AX) * signed16(source), storing the full product
 *   in DX:AX. CF/OF report failure to fit signed 16 bits; other
 *   arithmetic flags are undefined.
 *
 * Predicates:
 *   eq = ZF; lt = SF != OF; le = ZF || SF != OF.
 *   They do not change architectural flags.
 *
 * push16/pop16:
 *   Actual SS:SP accesses and wrapped SP updates, without flag changes.
 *   A PUSH source is evaluated before the stack write.
 *
 * far_call:
 *   Execute encoded far CALL, including architectural return-address
 *   stack writes, and the opaque external route.
 *   next_file identifies the expected supplied continuation, not an IP.
 *   Return to this C sequence only if execution returns there.
 *   Otherwise propagate the nonreturning/diverted execution externally.
 *   Every subsequent operation uses ALL actual returned live state:
 *   no register, segment, frame, memory, stack or flag preservation
 *   is assumed.
 *
 * leave_to_file:
 *   Transfer externally with no synthesized cleanup.
 *
 * retf:
 *   Architectural far return using the live stack, with no additional
 *   argument cleanup.
 *
 * C sequencing and labels represent the supplied instruction flow.
 * The execution adapter owns CS:IP mapping/advancement, including
 * omitted NOPs and local jumps, so CALL return addresses are exact.
 * This is a source splice over these primitives, not a standalone
 * emulator, prologue, ABI declaration or complete cast implementation.
 *
 * Build selection and fixed-build wrappers are host-side selection.
 * They execute no additional emulated instruction and change no
 * architectural flags.
 */

extern u8  r8 (Machine *, u16 segment, u16 offset);
extern u16 r16(Machine *, u16 segment, u16 offset);
extern void w8 (Machine *, u16 segment, u16 offset, u8 value);
extern void w16(Machine *, u16 segment, u16 offset, u16 value);

extern u16 add16(Machine *, u16, u16);
extern u16 or16 (Machine *, u16, u16);
extern u8  or8  (Machine *, u8, u8);
extern u16 xor16(Machine *, u16, u16);
extern u16 shl16(Machine *, u16, u8);
extern u16 inc16(Machine *, u16);
extern u16 dec16(Machine *, u16);

extern void cmp16(Machine *, u16, u16);
extern void cmp8 (Machine *, u8, u8);
extern void test8(Machine *, u8, u8);
extern void imul_ax(Machine *, u16 source);

extern bool eq(Machine *);
extern bool lt(Machine *);
extern bool le(Machine *);

extern void push16(Machine *, u16 value);
extern u16 pop16(Machine *);
extern void far_call(Machine *, u16 segment, u16 offset, u32 next_file);
extern void leave_to_file(Machine *, u32 file);
extern void retf(Machine *);

static u16 off16(u32 value)
{
    return (u16)value;
}

static u8 al(Machine *m)
{
    return (u8)m->ax;
}

static void set_al(Machine *m, u8 value)
{
    m->ax = (u16)((m->ax & 0xFF00u) | value);
}

static void set_cl(Machine *m, u8 value)
{
    m->cx = (u16)((m->cx & 0xFF00u) | value);
}

static u16 frame16(Machine *m, int displacement)
{
    return r16(m, m->ss, off16((u32)m->bp + displacement));
}

static u8 frame8(Machine *m, int displacement)
{
    return r8(m, m->ss, off16((u32)m->bp + displacement));
}

static void put_frame16(Machine *m, int displacement, u16 value)
{
    w16(m, m->ss, off16((u32)m->bp + displacement), value);
}

/* Read both LES pointer words before changing its destinations. */
static void les(Machine *m, u16 *destination, u16 ds_offset)
{
    u16 offset = r16(m, m->ds, ds_offset);
    u16 segment = r16(m, m->ds, off16((u32)ds_offset + 2));
    *destination = offset;
    m->es = segment;
}

static void cbw(Machine *m)
{
    u8 value = al(m);
    m->ax = (value & 0x80u) ? (u16)(0xFF00u | value) : value;
    /* Flags unchanged. */
}

/*
 * Entry: file 0xB36D9, requested DI == 131 (0x0083). 131:0xB36D9 160:= com1:=
 * All other registers, segments, frame values and memory are live inputs.
 * Other supplied writer branches are retained.
 */
static void overland_writer_splice(Machine *m, Build build)
{
    /* 0xB36D9–0xB3718: common writer. */ /* 131:0xB36D9,0xB3718 160:= com1:= */
    m->ax = frame16(m, F250_OL_LOCAL_UNIT);
    set_cl(m, 5);
    m->ax = shl16(m, m->ax, (u8)m->cx);

    les(m, &m->bx, F250_OL_DS_UNITS_PTR);
    m->bx = add16(m, m->bx, m->ax);

    m->ax = r16(m, m->es, off16((u32)m->bx + F250_OL_UNIT_ENCH_HIGH));
    m->dx = r16(m, m->es, off16((u32)m->bx + F250_OL_UNIT_ENCH_LOW));

    push16(m, m->ax);                 /* Old high word first. */
    m->ax = m->di;
    m->bx = F250_OL_SPELL_STRIDE;
    push16(m, m->dx);                 /* Old low word second. */
    imul_ax(m, m->bx);

    les(m, &m->bx, F250_OL_DS_SPELLS_PTR);
    m->bx = add16(m, m->bx, m->ax);

    m->ax = pop16(m);
    m->ax = or16(m, m->ax,
                r16(m, m->es, off16((u32)m->bx + F250_OL_SPELL_MASK_LOW)));
    m->dx = pop16(m);
    m->dx = or16(m, m->dx,
                r16(m, m->es, off16((u32)m->bx + F250_OL_SPELL_MASK_HIGH)));

    m->bx = frame16(m, F250_OL_LOCAL_UNIT);        /* Fresh frame read. */
    set_cl(m, 5);
    m->bx = shl16(m, m->bx, (u8)m->cx);
    les(m, &m->si, F250_OL_DS_UNITS_PTR);           /* Fresh far-pointer read. */
    m->si = add16(m, m->si, m->bx);

    w16(m, m->es, off16((u32)m->si + F250_OL_UNIT_ENCH_HIGH), m->dx);
    w16(m, m->es, off16((u32)m->si + F250_OL_UNIT_ENCH_LOW), m->ax);
    /* High-word store precedes low-word store, even if unchanged. */

    /* 0xB371C. */ /* 131:0xB371C 160:= com1:= */
    cmp16(m, m->di, F250_OL_SPELL_HEROISM);

    if (build == COM1) {
        if (eq(m)) {
            /* 0xB3722–0xB372D. */ /* 131:— 160:— com1:0xB3722,0xB372D */
            push16(m, m->es);
            push16(m, frame16(m, F250_OL_LOCAL_UNIT));
            far_call(m, 0x03C0, 0x008E, 0x0B372B); /* 131:— 160:— com1:0xB3726 */
            m->cx = pop16(m);
            m->es = pop16(m);
            w8(m, m->es, off16((u32)m->si + F250_OL_UNIT_LEVEL), al(m));
        }

        /* 0xB3731–0xB374A: low-byte gate and inherited ES:SI. */ /* 131:— 160:— com1:0xB3731,0xB374A */
        cmp8(m, frame8(m, F250_OL_ARG_CASTER), 0);
        if (!eq(m)) {
            set_al(m, r8(m, m->es, off16((u32)m->si + F250_OL_UNIT_TYPE)));
            cbw(m);
            m->bx = F250_OL_TYPE_STRIDE;
            imul_ax(m, m->bx);
            m->bx = m->ax;

            test8(m, r8(m, m->ds, off16((u32)m->bx + F250_OL_TYPE_ABILITIES_TABLE)),
                  F250_OL_UA_CREATEOUTPOST); /* 131:— 160:— com1:0xB3743 */
            if (!eq(m))
                w8(m, m->es, off16((u32)m->si + F250_OL_UNIT_STATUS), 0);
        }

        /* 0xB374F–0xB3765: NOPs. 0xB3766: JMP 0xB480C. */ /* 131:— 160:— com1:0xB374F,0xB3765,0xB3766,0xB480C */
        goto tail_com1;
    }

    /* MoM 1.31 and 1.60: identical supplied writer bytes. */
    if (eq(m)) {
        /* 0xB3722–0xB3738. */ /* 131:0xB3722,0xB3738 160:= com1:— */
        push16(m, frame16(m, F250_OL_LOCAL_UNIT));
        far_call(m, 0x03C0, 0x008E, 0x0B372A); /* 131:0xB3725 160:= com1:— */
        m->cx = pop16(m);

        m->dx = frame16(m, F250_OL_LOCAL_UNIT);
        set_cl(m, 5);
        m->dx = shl16(m, m->dx, (u8)m->cx);
        les(m, &m->bx, F250_OL_DS_UNITS_PTR);
        m->bx = add16(m, m->bx, m->dx);
        w8(m, m->es, off16((u32)m->bx + F250_OL_UNIT_LEVEL), al(m));
    }

    /* 0xB373C: use live DI after any returning call. */ /* 131:0xB373C 160:= com1:— */
    cmp16(m, m->di, F250_OL_SPELL_BLACK_CHANNELS);
    if (eq(m)) {
        /* 0xB3742–0xB3762. */ /* 131:0xB3742,0xB3762 160:= com1:— */
        m->ax = frame16(m, F250_OL_LOCAL_UNIT);
        set_cl(m, 5);
        m->ax = shl16(m, m->ax, (u8)m->cx);
        les(m, &m->bx, F250_OL_DS_UNITS_PTR);
        m->bx = add16(m, m->bx, m->ax);

        set_al(m, r8(m, m->es, off16((u32)m->bx + F250_OL_UNIT_MUTATIONS)));
        set_al(m, or8(m, al(m), F250_OL_UM_UNDEAD));

        m->dx = frame16(m, F250_OL_LOCAL_UNIT);
        set_cl(m, 5);
        m->dx = shl16(m, m->dx, (u8)m->cx);
        les(m, &m->bx, F250_OL_DS_UNITS_PTR);
        m->bx = add16(m, m->bx, m->dx);
        w8(m, m->es, off16((u32)m->bx + F250_OL_UNIT_MUTATIONS), al(m));
    }

    /* 0xB3766 -> 0xB480C: MoM tail. */ /* 131:0xB3766,0xB480C 160:= com1:— */
    cmp16(m, frame16(m, F250_OL_LOCAL_MODE), 1);
    if (!eq(m))
        goto clear_mom;

    put_frame16(m, F250_OL_LOCAL_CANDIDATE, F250_OL_NO_INDEX);
    put_frame16(m, F250_OL_LOCAL_SCAN, 0);
    goto mom_loop_test;

mom_loop_body:
    /* 0xB481E–0xB483A. */ /* 131:0xB481E,0xB483A 160:= com1:— */
    m->ax = frame16(m, F250_OL_LOCAL_SCAN);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;

    cmp8(m, r8(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_SCAN_MOM)), 0);
    if (le(m))
        goto mom_loop_increment;

    m->ax = frame16(m, F250_OL_LOCAL_SCAN);
    cmp16(m, m->ax, frame16(m, F250_OL_ARG_CASTER)); /* 131:0xB4832 160:= com1:— */
    if (eq(m))
        goto mom_loop_increment;

    m->ax = frame16(m, F250_OL_LOCAL_SCAN);
    put_frame16(m, F250_OL_LOCAL_CANDIDATE, m->ax);

mom_loop_increment:
    /* 0xB483D. */ /* 131:0xB483D 160:= com1:— */
    put_frame16(m, F250_OL_LOCAL_SCAN, inc16(m, frame16(m, F250_OL_LOCAL_SCAN)));

mom_loop_test:
    /* 0xB4840–0xB4847: pretested, signed word comparison. */ /* 131:0xB4840,0xB4847 160:= com1:— */
    m->ax = frame16(m, F250_OL_LOCAL_SCAN);
    cmp16(m, m->ax, r16(m, m->ds, F250_OL_DS_WIZARD_COUNT));
    if (lt(m))
        goto mom_loop_body;

    /* 0xB4849–0xB484D. */ /* 131:0xB4849,0xB484D 160:= com1:— */
    cmp16(m, frame16(m, F250_OL_LOCAL_CANDIDATE), 0);
    if (lt(m))
        goto clear_mom;

    /* 0xB484F–0xB4861. */ /* 131:0xB484F,0xB4861 160:= com1:— */
    m->ax = m->di;
    m->dx = F250_OL_SPELL_STRIDE;
    imul_ax(m, m->dx);
    les(m, &m->bx, F250_OL_DS_SPELLS_PTR);
    m->bx = add16(m, m->bx, m->ax);

    cmp8(m, r8(m, m->es, off16((u32)m->bx + F250_OL_SPELL_TAIL_KIND)), F250_OL_TAIL_KIND_2);
    if (eq(m))
        goto mom_tail_call;

    /* 0xB4863–0xB4875: repeat multiply, LES, addition and read. */ /* 131:0xB4863,0xB4875 160:= com1:— */
    m->ax = m->di;
    m->dx = F250_OL_SPELL_STRIDE;
    imul_ax(m, m->dx);
    les(m, &m->bx, F250_OL_DS_SPELLS_PTR);
    m->bx = add16(m, m->bx, m->ax);

    cmp8(m, r8(m, m->es, off16((u32)m->bx + F250_OL_SPELL_TAIL_KIND)), F250_OL_TAIL_KIND_4);
    if (!eq(m))
        goto clear_mom;

mom_tail_call:
    /* 0xB4877–0xB4885. */ /* 131:0xB4877,0xB4885 160:= com1:— */
    w16(m, m->ds, F250_OL_DS_TAIL_FLAG, 1);
    push16(m, frame16(m, F250_OL_ARG_CASTER));
    far_call(m, 0x0408, 0x006B, 0x0B4885); /* 131:0xB4880 160:= com1:— */
    m->cx = pop16(m);

clear_mom:
    /* 0xB4886–0xB4890. */ /* 131:0xB4886,0xB4890 160:= com1:— */
    m->ax = frame16(m, F250_OL_ARG_CASTER);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_1), 0);

    /* 0xB4896–0xB48A0: fresh frame read and multiplication. */ /* 131:0xB4896,0xB48A0 160:= com1:— */
    m->ax = frame16(m, F250_OL_ARG_CASTER);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_2), 0);

    /* 0xB48A6–0xB48B0: third fresh frame read and multiplication. */ /* 131:0xB48A6,0xB48B0 160:= com1:— */
    m->ax = frame16(m, F250_OL_ARG_CASTER);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_3), 0);
    goto epilogue;

tail_com1:
    /* 0xB480C–0xB4810. */ /* 131:— 160:— com1:0xB480C,0xB4810 */
    cmp16(m, frame16(m, F250_OL_LOCAL_MODE), 1);
    if (!eq(m))
        goto clear_com1;

    /* 0xB4812–0xB4821. */ /* 131:— 160:— com1:0xB4812,0xB4821 */
    m->ax = F250_OL_WIZARD_STRIDE;
    imul_ax(m, frame16(m, F250_OL_ARG_CASTER));
    m->bx = m->ax;
    push16(m, m->bx);

    cmp16(m, frame16(m, F250_OL_LOCAL_THRESHOLD), 0x012D);
    /* 0xB4820: NOP. */ /* 131:— 160:— com1:0xB4820 */
    if (lt(m))
        goto com1_pop_bx;

    /* 0xB4823. */ /* 131:— 160:— com1:0xB4823 */
    m->si = xor16(m, m->si, m->si);

com1_loop_body:
    /* 0xB4825: first iteration precedes any count comparison. */ /* 131:— 160:— com1:0xB4825 */
    m->ax = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->si);
    m->bx = m->ax;

    cmp8(m, r8(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_SCAN_COM1)), 0);
    if (le(m))
        goto com1_loop_increment;

    cmp16(m, m->si, frame16(m, F250_OL_ARG_CASTER)); /* 131:— 160:— com1:0xB4833 */
    if (eq(m))
        goto com1_loop_increment;

    /* 0xB4838: no immediately preceding explicit argument push. */ /* 131:— 160:— com1:0xB4838 */
    far_call(m, 0x0410, 0x0034, 0x0B483D); /* 131:— 160:— com1:0xB4838 */

    /* 0xB483D–0xB4844: returned live BX and SI. */ /* 131:— 160:— com1:0xB483D,0xB4844 */
    m->cx = m->bx;
    m->ax = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->si);
    m->bx = m->ax;

    /* 0xB4846–0xB4861: exact push/intervening-read sequence. */ /* 131:— 160:— com1:0xB4846,0xB4861 */
    push16(m, F250_OL_NO_INDEX);
    push16(m, r16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_PUSH_1)));
    push16(m, r16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_PUSH_2)));
    push16(m, r16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_PUSH_3)));
    push16(m, m->si);

    m->ax = F250_OL_SPELL_STRIDE;
    imul_ax(m, m->cx);
    les(m, &m->bx, F250_OL_DS_SPELLS_PTR);
    m->bx = add16(m, m->bx, m->ax);
    push16(m, r16(m, m->es, off16((u32)m->bx + F250_OL_SPELL_MASK_LOW)));

    /* 0xB4865–0xB486A. */ /* 131:— 160:— com1:0xB4865,0xB486A */
    far_call(m, 0x03C8, 0x0020, 0x0B486A); /* 131:— 160:— com1:0xB4865 */
    m->sp = add16(m, m->sp, 0x000C);

    /* 0xB486D–0xB4877: live DS, stack and returned state. */ /* 131:— 160:— com1:0xB486D,0xB4877 */
    m->ax = r16(m, m->ds, F250_OL_DS_UNIT_COUNT);
    m->ax = dec16(m, m->ax);
    push16(m, m->ax);
    far_call(m, 0x03C0, 0x0098, 0x0B4877); /* 131:— 160:— com1:0xB4872 */
    m->ax = pop16(m);

com1_loop_increment:
    /* 0xB4878–0xB487D: live SI and fresh count read. */ /* 131:— 160:— com1:0xB4878,0xB487D */
    m->si = inc16(m, m->si);
    cmp16(m, m->si, r16(m, m->ds, F250_OL_DS_WIZARD_COUNT));
    if (lt(m))
        goto com1_loop_body;

com1_pop_bx:
    /* 0xB487F: actual live-stack POP, not a cached restoration. */ /* 131:— 160:— com1:0xB487F */
    m->bx = pop16(m);
    /* 0xB4880: JMP 0xB20C6. */ /* 131:— 160:— com1:0xB4880,0xB20C6 */
    goto com1_continuation;

com1_continuation:
    /* 0xB20C6–0xB20CC. */ /* 131:— 160:— com1:0xB20C6,0xB20CC */
    cmp16(m, frame16(m, F250_OL_LOCAL_THRESHOLD), 0x0172);
    /* 0xB20CB: NOP. */ /* 131:— 160:— com1:0xB20CB */
    if (lt(m))
        goto com1_rejoin;

    /* 0xB20CE–0xB20D3: equality-to-zero, not signed positivity. */ /* 131:— 160:— com1:0xB20CE,0xB20D3 */
    cmp8(m, r8(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_SCAN_MOM)), 0);
    if (eq(m))
        goto com1_rejoin;

    /* 0xB20D5–0xB20D8: live DI. */ /* 131:— 160:— com1:0xB20D5,0xB20D8 */
    cmp16(m, m->di, F250_OL_SPELL_EXIT_EXCLUDED);
    if (eq(m))
        goto com1_rejoin;

    /* 0xB20DA–0xB20DF: exact mutation order. */ /* 131:— 160:— com1:0xB20DA,0xB20DF */
    m->di = F250_OL_SPELL_EXIT_REPLACEMENT;
    m->ax = xor16(m, m->ax, m->ax);
    put_frame16(m, F250_OL_LOCAL_THRESHOLD, 0);

    /* 0xB20E4: NOP. 0xB20E5: external JMP, no local cleanup. */ /* 131:— 160:— com1:0xB20E4,0xB20E5 */
    leave_to_file(m, 0x0B2C82);
    return;

com1_rejoin:
    /* 0xB20E8: JMP 0xB4883. 0xB4883–0xB4885: NOPs. */ /* 131:— 160:— com1:0xB20E8,0xB4883,0xB4883,0xB4885 */
    goto clear_com1;

clear_com1:
    /* 0xB4886–0xB4890. */ /* 131:— 160:— com1:0xB4886,0xB4890 */
    m->ax = frame16(m, F250_OL_ARG_CASTER);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_1), 0);

    /* 0xB4896–0xB48A0: second frame read and multiplication. */ /* 131:— 160:— com1:0xB4896,0xB48A0 */
    m->ax = frame16(m, F250_OL_ARG_CASTER);
    m->dx = F250_OL_WIZARD_STRIDE;
    imul_ax(m, m->dx);
    m->bx = m->ax;
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_2), 0);

    /* 0xB48A6: reuse BX; no third frame read or multiplication. */ /* 131:— 160:— com1:0xB48A6 */
    w16(m, m->ds, off16((u32)m->bx + F250_OL_WIZARD_CLEAR_3), 0);

    /* 0xB48AC–0xB48B0: NOPs. */ /* 131:— 160:— com1:0xB48AC,0xB48B0 */
    far_call(m, 0x02E0, 0x0034, 0x0B48B6); /* 131:— 160:— com1:0xB48B1 */

epilogue:
    /* 0xB48B6–0xB48BB: exact live-stack sequence. */ /* 131:0xB48B6,0xB48BB 160:= com1:= */
    m->di = pop16(m);
    m->si = pop16(m);
    m->sp = m->bp;
    m->bp = pop16(m);
    retf(m);
}

/* Fixed-build entry points; no emulated CALL/prologue is introduced. */
void overland_writer_mom_131(Machine *m)
{
    overland_writer_splice(m, MOM_131);
}

void overland_writer_mom_160(Machine *m)
{
    overland_writer_splice(m, MOM_160);
}

void overland_writer_com1(Machine *m)
{
    overland_writer_splice(m, COM1);
}
