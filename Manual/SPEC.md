# Interactive CoM2 Manual — Specification

A browsable, cross-linked, filterable rendering of the Caster of Magic for Windows
manual. This spec is the agreed target; build stages and current status are in
[PLAN.md](./PLAN.md).

## Purpose

The CoM2 manual is a 22,700-word linear document whose most valuable content is either
buried in prose or trapped in bitmap images. This page turns it into structured data you
can filter, sort, and cross-reference.

## Source authority

**The manual HTML is the only source of presented content.** Everything the page
displays traces to `Reference docs/CoM2manual.html` or to one of the three images it
embeds.

Every other source — the in-game helptext, `UNITS.INI`, the calculator's formulas — is
an **independent check**, never a primary source. They are used to verify what the
parser extracted and to inform design, and their disagreements are recorded in the
discrepancies report. They are never rendered on the page and never fill a gap in the
manual's coverage.

> This does not conflict with the co-equal-sources rule in the root
> [CLAUDE.md](../CLAUDE.md). That rule governs how a *developer verifies a mechanic* —
> read both, never one alone. This rule governs what this *page presents*. Verification
> still consults both; presentation shows the manual.

**Consequence:** where the manual is silent, the page is silent. Most notably, the
manual has no unit-ability glossary, so ability names appear in unit stat lines with no
definition behind them. That is intended, not a gap to be filled later from helptext.

## Scope

**In scope**

- CoM2 (Caster of Magic for Windows **1.5.11**) only.
- The manual body: chapters *Philosophy* through *Modding*.
- All three image-only tables, transcribed to data.

**Out of scope — deliberate non-goals**

- **The changelog.** `CoM2manual.html` lines 7,626–13,010 (~40% of the file) are version
  history and are not ingested.
- **Presenting helptext, `UNITS.INI`, or calculator-derived content.** See *Source
  authority*.
- **CoM 1 and Warlord.** `CoM1manual.HTML` and `CoM2WarlordManual.pdf` exist in
  `Reference docs/` but are not v1 scope. The JSON schema carries a version field so
  they can be added later without a rewrite; nothing else should assume single-version.
- **Any coupling to the damage calculator.** This is a separate page. It does not import
  calculator logic, and the calculator does not depend on it.
- Editing, annotating, or user-contributed content. Read-only.

## Sources

**Presented**

| Source | Role |
|---|---|
| `Reference docs/CoM2manual.html` | The manual. OpenOffice 4.1.14 export, **Shift_JIS** encoded. |
| `Reference docs/CoM2manual_files/*.{png,gif}` | The three image-only tables. |

**Verification only — never rendered**

| Source | Checks |
|---|---|
| `Reference docs/CoM2 helptext.TXT` | Spell/retort/race/building/item-power coverage and effects. |
| `Calculator/units_com2.js` | Unit stat lines (generated from the authoritative `UNITS.INI`). |
| `Calculator/` formulas | Mechanics described in prose. |

### Why the HTML, not `CoM2 manual.txt`

Three things carry meaning in the HTML and are lost in the plain-text export:

- `<strike>` in the Races chapter means *"this race cannot build this."* The `.txt`
  renders it as plain text, which inverts the meaning.
- Realm colour on spell headings (`#00ae00` = Nature, etc.) is a free realm tag.
- The three tables exist only as `<img>`; the `.txt` has nothing at all.

`Reference docs/CoM2manual_files/` is exempted from the `*_files/` rule in `.gitignore`
so the table images are tracked. The page has no *runtime* dependency on them — their
content lives in the committed JSON — but they are required to re-run the transcription
step from a fresh clone.

## Architecture

Offline generator → committed JSON → static page. This mirrors the existing
`tools/generate_com2_units_json.py` → `units_com2.js` pattern.

```
tools/parse_com2_manual.py   # HTML + images -> JSON      (build time)
Manual/manual_com2.json      # generated, committed
Manual/DISCREPANCIES.md      # generated, committed       (review artifact)
Manual/index.html
Manual/manual.js
Manual/manual.css            # inherits Calculator/style.css design tokens
```

Fragile parsing heuristics stay out of the browser; extraction output is reviewable and
diffable in git; the page is static and needs no server.

### Verification

`python tools/parse_com2_manual.py --verify` is the build's pass/fail signal. It exits
nonzero on any failed assertion below. Any change to the parser or JSON must leave it
green.

## Extraction contract

The source has **no `<h1>`–`<h6>` tags**, and heading markup is not uniform — observed
variants include `<font size="6"><b>`, `<font size="7" style="font-size: 32pt"><b>`,
`<font size="6"><u><b>`, a `<font color=…>` wrapper, and nested `<span>`s. Adjacency
regexes miss headings. The parser therefore tokenizes into **runs** (text plus a style
computed from the open-tag stack) and classifies each paragraph by its first run.
Inline `font-weight: normal` / `text-decoration: none` cancel an enclosing `<b>`/`<u>`;
OpenOffice relies on this to place body text inside a bold heading element.

### Hierarchy

Font size alone does not give the hierarchy: size ≥ 6 marks both true chapters *and*
mid-level groupings (Arcanus/Myrror inside Races, the six realms inside Spells, New/Old
inside Hero Abilities). The **17 chapter titles are therefore an explicit list** in the
parser, taken from the document's own table of contents; any other size ≥ 6 heading is a
group nested in the current chapter.

    chapter → group → section → entry → body

### Entry detection is per-chapter

**There is no global entry rule.** Each chapter marks entries differently, and two
cannot be detected by style at all:

| Chapter | Entry markup |
|---|---|
| Spells | size 4, bold + underline, realm-coloured, numbered |
| Item Powers | size 4, bold + underline, realm-coloured |
| Races | size 5, bold + underline |
| Retorts | size 4, **bold only**; body shares the heading paragraph in a `font-weight: normal` span |
| Buildings | size 4, **bold only**, stylistically identical to their own field lines — must be detected by *content*: a bold size-4 paragraph not matching `^(Cost\|Effect\|Required by\|Special)\s*:` |
| Hero Abilities / Hero Types | size 4, **underline only**, all fields in one paragraph split by `<br>`. The FAQ chapter uses the same markup for its questions, so this rule must be scoped to the Heroes chapter |
| Common Units | no heading markup at all; plain body lines shaped `-Name (cost) : stats` |

A parser that applies only the style rule silently yields no retorts, no buildings, no
hero abilities and no hero types — and would pass a verify step that only asserted
spells and races. Each chapter's count must be added to the assertions as its
extraction lands.

### Fail loud

- Assert expected entity counts. Confirmed so far: **17 chapters, 14 races, 234 spells,
  272 style-detected entries**. Counts not yet confirmed must not be asserted as if
  they were.
- **Never relax a failing assertion.** A mismatch means the parser or the count is
  wrong; both are defects to report, not thresholds to tune.
- Emit an **unclaimed-text report**: any body text not assigned to an entity. A silent
  drop is a defect.

## Discrepancies report

`Manual/DISCREPANCIES.md` is a build output, regenerated on every run. It records
everything the verification sources disagree with the manual about:

- Entities present in a verification source but absent from the manual, and vice versa
  (the helptext has 235 `#Spell` entries against the manual's 233).
- Substantive disagreements in cost, effect, stats, or immunities.
- Cells where a transcribed table conflicts with a verification source.

**A discrepancy never changes what the page presents.** The manual's version is
rendered; the disagreement is logged. The report is surfaced for human review at the end
of a build run, not resolved mid-run.

## Entity model

Only fields the manual actually states. Fields available in the helptext but absent from
the manual — spell target, spell upkeep, spell type — are deliberately not modelled.

| Type | Count | Structured fields |
|---|---|---|
| Spell | **234** (confirmed) | realm (heading colour), rarity (section), casting cost, research cost, effect text. Some entries state a per-turn upkeep inside the cost line; capture it when present. |
| Item power | 37 or 38 — **unresolved** | realm (heading colour), books required, Create Artifact required, allowed slots |
| Unit | ~60 | stats, abilities, cost, building requirement, race |
| Race | 14 | growth, modifiers, forbidden buildings (`<strike>`), unique units, unrest row |
| Building | ~30 | cost, upkeep, effect, requires / required-by |
| Retort | 18 | pick cost, effect, mutual exclusions |
| Hero type | ~30 | type, fame, caster level, spells, hero/other/random abilities |
| Hero ability | ~25 | type, super available, effect |
| Chapter | 17 (confirmed) | prose, cross-linked |

Spells break down as Arcane 14, plus five realms of Common 10 / Uncommon 10 / Rare 12 /
Very Rare 12. All five realms landing on an identical rarity split is what corroborates
234 — an earlier adjacency-regex count said 233 because one heading splits across lines.

The item-power count is the **first thing to resolve**: style detection finds 37, a hand
count of the realm groupings suggests 38. The helptext is little help here (13 `#IP`
entries against ~38), so this has to be settled against the HTML itself.

## Rendering requirements

- **Spells** — filter by realm × rarity; sort by casting or research cost.
- **Item powers** — must support the *inverted* query the manual cannot answer:
  "given this equipment slot and this many books of this realm, what can I apply?"
  The manual lists restrictions per power; the page must let you filter by slot and
  book count.
- **Buildings** — the manual states dependency trees in prose ("Shrine → Cathedral").
  Render as a graph, cross-linked to which races are barred from each building and
  which units each unlocks.
- **Races** — one card: modifiers, forbidden buildings, unique units with stats, and
  that race's row of the unrest matrix.
- **Hero types / abilities** — sortable tables; must support "which heroes have
  ability X".
- **Difficulty matrix** — the transcribed GIF as a filterable table, ~70 rows × 9
  difficulty levels, retaining the moddable-source column linking into *Modding*.
- **Mechanics chapters** — prose, auto-linked.

### Cross-linking

Prose auto-links known entity names to hover-cards. This requires an explicit
**disambiguation map**, because names collide across types: `Resist Elements` is both a
spell and an item power; `Priests` is four different racial units. Ambiguous names must
resolve by context or offer a choice — never link to an arbitrary match. Names with no
manual entry behind them (most unit abilities) are not linked.

One global fuzzy search spans all entity types.

## Transcribed tables

Three tables exist only as images and are transcribed into JSON:

| Image | Contents | Verification |
|---|---|---|
| `CASTERWIN_html_m772fad36_Rrt0.gif` | Difficulty matrix, ~70 × 9 | **No verification source.** Machine-transcribed; flagged for human spot check. |
| `CASTERWIN_html_m1298992f_Rrt0.png` | Interracial unrest, 14 × 14 | Cross-checked against the helptext's per-race unrest lines; conflicts logged. |
| `CASTERWIN_html_m6e1c07a2_Rrt0.png` | Map size by AI count × land setting | Partially cross-checked against helptext `#Landsize` percentages. |

The difficulty matrix is the single highest-value artifact here: the manual's
*Difficulty* chapter contains **no text at all**, and nothing else in the repo holds
this data.

## Invariants

1. Every presented string traces to `CoM2manual.html` or a transcribed table. Nothing on
   the page originates in the helptext, `UNITS.INI`, or the calculator.
2. Entity counts match the asserted values, or `--verify` fails.
3. The unclaimed-text report is empty.
4. The page is fully static — no network calls at runtime.
5. Regenerating from unchanged sources produces byte-identical JSON.
