# Interactive CoM2 Manual — Specification

A browsable, cross-linked, filterable rendering of the Caster of Magic for Windows manual.
Current stage and next work are in `PLAN.md`.

## Purpose and source authority

Presented content comes only from `Reference docs/CoM2manual.html` and its three embedded table
images. Helptext, `UNITS.INI`, and calculator formulas verify extraction but are never rendered or
used to fill gaps. Disagreements go to `Manual/DISCREPANCIES.md`.

This presentation rule does not weaken the root requirement to consult both manual and helptext
when verifying a mechanic. Where the manual is silent, this page is silent; in particular, it does
not invent a unit-ability glossary.

## Scope

In scope: CoM2 1.05.11, chapters Philosophy through Modding, and all three image-only tables.

Out of scope: the changelog, CoM 1, Warlord, calculator integration, editing/annotation, and content
derived from verification sources. The data schema retains a version field for future expansion.

The Shift_JIS HTML is required rather than a plain-text export because `<strike>` marks forbidden
race buildings, heading color supplies spell/item realms, and the three tables exist only as
images.

## Architecture and verification

```text
tools/parse_com2_manual.py   HTML/images → JSON
Manual/manual_com2.json      generated, committed
Manual/DISCREPANCIES.md      generated, committed
Manual/index.html
Manual/manual.js
Manual/manual.css
```

Extraction is offline; the page is static. `python tools/parse_com2_manual.py --verify` is the
pass/fail signal and must remain green after parser or data changes.

## Extraction contract

The source has no semantic heading tags and inconsistent OpenOffice markup. Tokenize paragraphs
into styled text runs using the open-tag stack. Inline normal-weight/no-decoration styles cancel
enclosing bold/underline. Treat `<br>` as a field separator and raw newlines as wrapping.

### Hierarchy and headings

- The 17 chapter titles are an explicit list taken from the table of contents. Other size ≥6
  headings are groups within the current chapter.
- Hierarchy is `chapter → group → section → entry → body`.
- In Heroes, `Old` is a section sibling of `New`, not a group. In Item Powers, colored size-4 realm
  headings are groups despite lacking underline.
- A heading may begin after body text inside the same paragraph. Split at a transition from visible
  non-entry styling to entry styling, while keeping adjacent styled runs of one heading together.
  This rule recovers the item power `Lightning` and fires exactly once in the current source.

### Entry detection

Entry rules are chapter-scoped:

| Chapter | Rule |
|---|---|
| Spells | numbered, size 4, bold + underline, realm-colored |
| Item Powers | size 4, bold + underline, realm-colored |
| Races | size 5, bold + underline |
| Retorts | size 4, bold; body may share the paragraph |
| Buildings | size 4, bold, excluding known field labels |
| Hero abilities/types | size 4, underline, scoped to Heroes |
| Common/racial units | content-shaped plain stat lines |

Spells and item powers use separate realm palettes:

| Realm | Spells | Item powers |
|---|---|---|
| Chaos | `#ff3333` | `#ff3300` |
| Death | `#9966cc` | `#9933ff` |
| Nature | `#00ae00` | `#009900` |
| Sorcery | `#0099ff` | `#3399ff` |
| Life | `#b3b3b3` | `#b3b3b3` |

Arcane spell realm comes from its group heading.

### Fail loud

- Assert every entity count below and structural requirements such as spell costs, item book
  requirements, building effects, and hero types.
- Assert internal references: hero abilities, common units, buildings, and name corrections.
- Reject unknown unit-stat tokens.
- Emit an unclaimed-text report and require it to be empty.
- Never relax an assertion to make a run pass. Confirm changed counts by a second, structurally
  different method.

## Discrepancies report

`Manual/DISCREPANCIES.md` is regenerated and records manual-vs-verification and manual-vs-itself
conflicts. Verification conflicts never alter presented content. A repaired internal reference is
recorded alongside the literal source text.

Required normalization/corrections:

| Manual text | Structured result |
|---|---|
| `Alchemist Guild` | `Alchemist's Guild` |
| `Ship Wringhts Guild` | `Ship Yard` (maintainer-supplied mapping) |
| Undescribed `Engineers` references | common unit with `described: false` and no invented stats |
| Golem's shared-head `Resist Elements, Poison, Death, Stoning, Fire, Cold Immunity` | distribute `Immunity` over the bare subjects; never expand bare `Illusion` |
| Sky Drake `Illusions Immunity` | `Illusion Immunity` |

Two maintainer-supplied facts are allowed because they interpret notation rather than add game
content: a trailing `*` on a hero ability means its Super variant, and `Ship Wringhts Guild` means
Ship Yard. Super references must resolve to abilities marked `Super : Available`.

## Entity model

Only fields stated by the manual are modelled. Keep raw strings alongside parsed numeric forms.

| Type | Count | Principal fields |
|---|---:|---|
| Spell | 234 | realm, rarity, casting/research cost, effect, optional upkeep, summons |
| Summoned creature | 48 | spell, realm, rarity, timing, parsed stats/abilities |
| Item power | 38 | realm, books, Create Artifact requirement, slots, effect |
| Item power limit | 9 | slot/bonus restriction |
| Common unit | 13 | cost, stats, abilities, `described`; 12 have stat lines |
| Racial unit | 42 | race, cost, stats, abilities, building requirements, other conditions |
| Race | 14 | plane, modifiers, forbidden buildings, common/unique units, notes |
| Building | 35 | cost, upkeep, effect, dependencies, special |
| Production option | 2 | Housing and Trade Goods; effect only, outside dependency graph |
| Building tree | 7 | dependency edges |
| Retort | 18 | pick cost, effect, exclusions |
| Hero type | 35 | type, fame, caster/spells, abilities, Super abilities |
| Hero ability | 24 | era, type, Super availability, effect |
| Chapter | 17 | prose |

### Unit stat lines

Parse number-first tokens such as `7 Melee` as stats; rated names such as `Caster 20` remain
abilities. Preserve melee, thrown, physical/magical ranged, and both breaths as separate channels.
Normalize only known spelling variants. Every described unit must have defense, health, movement,
and resistance.

### Summoned creatures

Detect summoned creatures by a parsed stat line containing all four universal stats, not by a
particular label. This covers 48 entries across several labels and two unlabeled forms. Each is a
unit-shaped entity back-linked from its spell. Split fused attack/To-Hit text where necessary.

## Rendering requirements

- Spells: filter realm × rarity; sort by casting or research cost.
- Item powers: inverted slot + realm-book-count query.
- Buildings: dependency graph linked to barred races and unlocked units.
- Races: modifiers, forbidden buildings, unique units, and unrest row.
- Hero types/abilities: sortable and queryable by ability.
- Difficulty: filterable ~70 × 9 matrix with moddable-source links.
- Mechanics chapters: auto-linked prose.
- One global fuzzy search spans all entity types.

Auto-link only unambiguous entities. Resolve collisions such as `Resist Elements` and `Priests` by
context or offer a choice; never choose arbitrarily. Names without manual entries are not links.

## Transcribed tables

| Image | Contents | Verification |
|---|---|---|
| `CASTERWIN_html_m772fad36_Rrt0.gif` | difficulty matrix, ~70 × 9 | no independent source; flag for human spot check |
| `CASTERWIN_html_m1298992f_Rrt0.png` | interracial unrest, 14 × 14 | compare with helptext |
| `CASTERWIN_html_m6e1c07a2_Rrt0.png` | map size by AI count × land | partially compare with helptext |

## Invariants

1. Every presented string traces to the manual HTML or a transcribed table.
2. Entity counts and structural/reference assertions pass.
3. The unclaimed-text report is empty.
4. Runtime is fully static with no network calls.
5. Unchanged sources regenerate byte-identical JSON.
