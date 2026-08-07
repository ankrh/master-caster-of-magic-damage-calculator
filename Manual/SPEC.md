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

- CoM2 (Caster of Magic for Windows **1.05.11**) only.
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

### Why the HTML, not a plain-text export

Three things carry meaning in the HTML and were lost in the `CoM2 manual.txt` export the repo
used to carry:

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

`<br>` is a real field separator throughout (stat lines, field lists) while the source's
raw newlines are only soft wrapping. The tokenizer records `<br>` as an explicit marker
and collapses all other whitespace, so a paragraph's true lines are recoverable — field
parsing is unreliable without this.

### Headings that start mid-paragraph

A heading is sometimes glued to the tail of the previous entry's body inside one `<p>`.
Classifying on the leading run alone drops it silently; this is exactly how one item
power went missing. The parser splits a paragraph at a **style transition** — an
entry-styled run that follows visible non-entry-styled text. The transition test matters,
because one heading is often several entry-styled runs (`9` + `.` + `Disjunction`) that
must not be split apart. Document-wide the split fires exactly once.

### Hierarchy

Font size alone does not give the hierarchy: size ≥ 6 marks both true chapters *and*
mid-level groupings (Arcanus/Myrror inside Races, the six realms inside Spells, New/Old
inside Hero Abilities). The **17 chapter titles are therefore an explicit list** in the
parser, taken from the document's own table of contents; any other size ≥ 6 heading is a
group nested in the current chapter.

    chapter → group → section → entry → body

Two chapters need the size-based hierarchy **overridden**, because the font sizes
contradict the structure the document's own table of contents states:

| Chapter | Override |
|---|---|
| Heroes | `Old` is size 6 — which would make it a group — but it is the sibling of the size-5 `New`. Left alone, `Hero Types` nests inside `Old`. The TOC lists *Hero abilities* and *Hero types* as the chapter's two divisions. |
| Item Powers | The five realm headings are size-4 bold and coloured with **no underline**, so the size rule reads them as body and all 38 powers collapse into the preceding `Health (new)` section. |

### Entry detection is per-chapter

**There is no global entry rule.** Each chapter marks entries differently, and two
cannot be detected by style at all:

| Chapter | Entry markup |
|---|---|
| Spells | size 4, bold + underline, realm-coloured, numbered |
| Item Powers | size 4, bold + underline, realm-coloured |
| Races | size 5, bold + underline |
| Retorts | size 4, **bold only**; body shares the heading paragraph in a `font-weight: normal` span |
| Buildings | size 4, **bold only**, stylistically identical to their own field lines — must be detected by *content*: a bold size-4 paragraph not matching `^(Cost\|Effect\|Required by\|Requires\|Special)\s*:` |
| Hero Abilities / Hero Types | size 4, **underline only**, all fields in one paragraph split by `<br>`. The FAQ chapter uses the same markup for its questions, so this rule must be scoped to the Heroes chapter |
| Common Units | no heading markup at all; plain body lines shaped `-Name (cost) : stats` |
| Racial units | no heading markup either; `Name (cost, building) : stats`, inside a race section |

A parser that applies only the style rule silently yields no retorts, no buildings, no
hero abilities and no hero types — and would pass a verify step that only asserted
spells and races.

### Realm colour

Spells and item powers use **different palettes for the same five realms**, so one
shared colour→realm map is wrong:

| Realm | Spells | Item powers |
|---|---|---|
| Chaos | `#ff3333` | `#ff3300` |
| Death | `#9966cc` | `#9933ff` |
| Nature | `#00ae00` | `#009900` |
| Sorcery | `#0099ff` | `#3399ff` |
| Life | `#b3b3b3` | `#b3b3b3` |

Arcane spells carry no colour; their group heading is the only realm signal.

### Fail loud

- Assert expected entity counts — every count in the entity model below is asserted.
- **Never relax a failing assertion.** A mismatch means the parser or the count is
  wrong; both are defects to report, not thresholds to tune.
- Assert **structural** facts too, not just totals: every spell has a cost and a
  research line, every item power a book requirement, every building an effect, every
  hero type a `Type`. A count can be right while the fields behind it are empty.
- Assert **referential integrity** of the manual against itself: hero-type ability
  references resolve to hero abilities, race common-unit references resolve to units,
  dependency-tree names resolve to buildings, and both name corrections still land on a
  real building. A name that stops resolving is normally a parse regression; a correction
  that stops resolving means the mapping went stale.
- Emit an **unclaimed-text report**, which must be empty. In a chapter that yields
  entities, body text appearing after the first entity but attached to none is a defect
  — that is the check that catches a missed heading, whose orphaned body would otherwise
  attach to the enclosing section and look fine. Prose chapters have no entities, so
  their text attaches to the chapter; a chapter's own introduction legitimately precedes
  its first entity.

## Discrepancies report

`Manual/DISCREPANCIES.md` is a build output, regenerated on every run. It records
everything the verification sources disagree with the manual about:

- Entities present in a verification source but absent from the manual, and vice versa
  (the helptext has 235 `#Spell` entries against the manual's 234).
- Substantive disagreements in cost, effect, stats, or immunities.
- Cells where a transcribed table conflicts with a verification source.

It also carries the manual's disagreements **with itself**, found during extraction.
Unlike verification-source conflicts these *are* repaired — a broken cross-reference
makes the page wrong — but never silently. Each correction is recorded in
`entities.name_corrections` with the manual's literal text beside it, tagged `kind`
(`building` or `ability`) since the two are asserted differently — a building correction
must resolve to a real building, and no corrected spelling may survive in the output.

| Manual says | Resolution |
|---|---|
| `Alchemist Guild` (Library's *Required by*) | → `Alchemist's Guild`. A missing apostrophe; the target is unambiguous from the manual. |
| `Ship Wringhts Guild` (Lizardmen's forbidden buildings) | → `Ship Yard`. A leftover of the base game's naval naming, which CoM2 collapsed to Ship Yard plus Maritime Guild. The target is **not** recoverable from the manual — this mapping is the maintainer's. |
| `Engineers` — named in five races' permitted common units and in Builder's Hall's *Required by*, but with **no entry** in the Common Units chapter | Carried as a common unit with `described: false` and no stats, so cross-links resolve while the absent stats stay absent. |
| The Dwarf Golem's `Resist Elements, Poison, Death, Stoning, Fire, Cold Immunity, Wall Crusher` — the only shared-head list in the manual | The trailing `Immunity` is distributed over the bare subjects. Left literal, bare `Poison` would mean a poison *attack*, which is what it means everywhere else (`Poison 4` on Manticores). |
| `Illusions Immunity` on the Sky Drake, against `Illusion Immunity` on twelve other creatures | → `Illusion Immunity`. Left alone, a filter for "immune to illusions" silently misses that one unit. |

That the expansion is right is corroborated by what it does to the vocabulary: three of
the four expanded names merge into immunities other units already state in full, taking
the distinct ability count from 41 to 38 with only `Stoning Immunity` genuinely new.

**`Illusion` is excluded by name and can never take part in an expansion.** Bare
`Illusion` is an ability in its own right — it makes a unit's attacks illusionary — and
Phantom Warriors and Phantom Beast both carry it. Expanding it would invent an immunity
*and* destroy a real ability. The manual corroborates the distinction twice over: every
creature genuinely immune writes `Illusion Immunity` out in full, and both Phantoms have
0 defense, the signature of an illusion-attacker rather than an immune one. Nothing is
lost by the exclusion, and it holds however the token appears — unlike a rule keyed on
run length, which would only happen to be right for the cases seen so far.

The build asserts the rule is **idempotent** rather than hunting bare tokens, so an
excluded subject survives untouched while an undistributed shared head still fails.

`Engineers` is the sharpest illustration of *where the manual is silent, the page is
silent*: the unit exists by name, so it is listed, but nothing invents stats for it.
`described` is what a renderer keys on to avoid promising data that does not exist.

**A discrepancy never changes what the page presents.** The manual's version is
rendered; the disagreement is logged. The report is surfaced for human review at the end
of a build run, not resolved mid-run.

## Entity model

Only fields the manual actually states. Fields available in the helptext but absent from
the manual — spell target, spell upkeep, spell type — are deliberately not modelled.

All counts below are confirmed and asserted. Each was corroborated by a second,
structurally different method — a count derived one way can be wrong.

| Type | Count | Structured fields |
|---|---|---|
| Spell | **234** | realm (group + heading colour), rarity (section), casting cost, research cost, effect text, and `summons` back-linking to any creature it summons. Some entries state a per-turn upkeep inside the cost line; captured when present. Numeric forms are derived alongside the raw strings, which `Variable MP` and `None` need. |
| Summoned creature | **48** | name, summoning spell, realm, rarity, when it can be summoned, parsed stats and abilities — the same shape as a buildable unit. See *Summoned creatures* below. |
| Item power | **38** | realm (group + heading colour), books required, Create Artifact required, allowed slots, effect |
| Item power limits | **9** | the size-5 sections (Attack, Defense, To Hit, …) stating which slot may carry which bonus — what the inverted slot filter needs |
| Common unit | **13** | cost, parsed stats, abilities. 12 carry a stat line; `Engineers` is named elsewhere in the manual but never described, so it is carried with `described: false` — see *Discrepancies report*. Both counts are asserted, so the stat-line count stays a real signal. |
| Racial unit | **42** | cost, parsed stats, abilities, race, and its requirements split into `requires` (buildings) and `conditions` (everything else, e.g. Carrak's `sea access`) so the dependency graph stays purely buildings |

### Unit stat lines

A stat line is one string in the source. It is parsed into `stats` (numeric) and
`abilities` (the rest), with the verbatim string kept as `stats_text` — that string is
what the manual says and what the page renders.

**A stat is written number-first (`7 Melee`); an ability is not, even when it carries a
rating (`Caster 20`, `Scouting 2`).** That ordering is the entire discriminator, and it
holds across all 54 stat lines.

Attack types are deliberately *not* collapsed into a single `attack` key — melee, thrown,
ranged, magical ranged and the two breath attacks are different mechanics. The only
normalisation is of spelling variants: the Common Units chapter writes `attack` where the
racial units write `Melee`, and singular `figure` appears once.

Two assertions keep this honest: every described unit carries `defense`, `health`,
`movement` and `resistance` (all 54 do), and **no stat token may go unrecognised** — an
unknown token is reported, never quietly demoted to an ability.

### Summoned creatures

The manual gives every summoning spell's creature a full stat line inside the spell
entry. These are modelled as their own entity type, sharing the unit stat shape above,
and each spell back-links via `summons`.

**Detection is by shape, never by label.** The manual labels these six different ways —
`Creature :` (39), `Combat Creature :` (3), `Combat Summon :` (2), `Combat only summon :`
(1), `Combat or Overland Creature :` (1), and twice with no label at all. Keying on the
obvious `Creature :` finds **39 of 48** — a 25% undercount of exactly the kind that
produced the 233-vs-234 spell error.

A line qualifies when parsing it yields all four universal stats as real numbers. That
test rejects prose which merely mentions the words: *Mystic Surge* names movement,
defense, resistance and health across three sentences, but none parse as number-first
tokens. The count is corroborated by a second method that ignores labels entirely —
effect lines carrying six or more number-first stat tokens — which returns the same 48
with no set difference. Both are asserted, so the two can never silently diverge.

Some summon lines fuse the To Hit bonus onto the attack with no comma
(`20 Ranged (3 ammo) +20% To Hit`); it is split back off.
| Race | **14** | plane, modifiers, forbidden buildings (`<strike>`), permitted common units and its modifiers to them, unique units, notes |
| Building | **35** | cost, upkeep, effect, requires / required-by, special |
| Production option | **2** | Housing and Trade Goods: an effect but no cost. Perpetual production options rather than constructible buildings, so they are modelled apart and stay out of the dependency graph. |
| Building tree | **7** | the dependency trees, as requires → unlocks edges |
| Retort | **18** | pick cost, effect, mutual exclusions |
| Hero type | **35** | type, fame, caster level, spells, hero/other/random abilities, plus `super_abilities` — those held at Super level |
| Hero ability | **24** | era (New/Old), type, super available, effect |
| Chapter | **17** | prose, cross-linked |

Corroborating methods, for the counts where one method was not enough:

- **Spells 234** — Arcane 14, plus five realms of Common 10 / Uncommon 10 / Rare 12 /
  Very Rare 12. All five realms landing on an identical rarity split is the
  corroboration; an earlier adjacency-regex count said 233 because one heading splits
  across lines.
- **Item powers 38** — settled against the HTML, as the helptext cannot help (13 `#IP`
  entries against 38). Style detection finds 37; the 38th is `Lightning`, a heading that
  starts mid-paragraph. Confirmed three further ways: 38 `Books required` lines, 38
  `Create Artifact required` lines, and realm groups of Chaos 9 / Death 9 / Nature 7 /
  Life 6 / Sorcery 7.
- **Buildings 37** (35 + 2 options) — 37 name blocks, each with exactly one `Effect :`
  line.
- **Racial units 42** — corroborated by a collision this spec names independently:
  `Priests` resolves to exactly four racial units (High Men, Nomad, Beastmen, Dark Elf).

### Knowledge that is not in the manual

Two facts the page relies on come from the maintainer rather than the source. Both are
*legends and mappings* — they say what a mark or a misspelling in the manual refers to.
Neither adds content: no stat, cost, or effect on the page originates outside the manual,
so *Source authority* holds.

- A trailing `*` on a hero-type ability reference marks the **Super variant** of that
  ability, pairing with the ability's own `Super : Available` field. The manual prints
  the marker on 13 of 63 references but gives no legend — every other `*` in the document
  is a multiplication operator. Captured as `super_abilities`, and asserted: every `*`
  ability must be one the manual marks `Super : Available`.
- `Ship Wringhts Guild` refers to the **Ship Yard**, as recorded above.

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
