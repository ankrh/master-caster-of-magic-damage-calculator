#!/usr/bin/env python3
"""Parse the CoM2 manual HTML export into structured JSON.

Source of truth: ``Reference docs/CoM2manual.html`` (OpenOffice export, Shift_JIS).
See ``Manual/SPEC.md`` for the contract this implements.

The export carries no <h1>-<h6> tags; document hierarchy is encoded purely in font
size plus bold/underline. Heading markup is *not* uniform -- observed variants:

    <font size="6"><b>X</b>
    <font size="7" style="font-size: 32pt"><b>X</b>
    <font size="6"><u><b>X</b></u>
    <font color="#00ae00"><font size="6"><b>X</b>
    <font size="3"><i><span ...><font size="6"><span ...><b>X</b>

so adjacency-based regexes miss headings. Instead we tokenize into *runs* (text
with a computed style from the open-tag stack) and classify paragraphs by the
style of their first run. Some entries (Retorts) put the bold heading and its
normal-weight body in a single paragraph, which run-splitting handles naturally.

Line structure matters: <br> is a real field separator throughout (stat lines,
field lists), while the raw newlines in the source are only soft wrapping. The
tokenizer therefore records <br> as an explicit BR marker and collapses every
other whitespace run to a single space, so ``Para.lines`` gives the true lines.

Usage:
    python tools/parse_com2_manual.py --census    # structural summary
    python tools/parse_com2_manual.py --verify    # assertions; exit 1 on failure
    python tools/parse_com2_manual.py --emit      # write Manual/manual_com2.json
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = REPO / "Reference docs" / "CoM2manual.html"
OUT_JSON = REPO / "Manual" / "manual_com2.json"

# Explicit <br> marker. Chosen so it survives whitespace collapsing and can never
# collide with document text.
BR = "\x00"

# The changelog is out of scope (Manual/SPEC.md, non-goals). Everything from this
# chapter heading onward is discarded.
CHANGELOG_HEADING = "version history"

# Font size does NOT give the hierarchy on its own: size >= 6 is used both for true
# chapters and for mid-level groupings (Arcanus/Myrror inside Races, the six realms
# inside Spells, New/Old inside Hero Abilities). The document's own table of contents
# is the authority on which is which, so the chapter list is explicit. Any other
# size >= 6 heading is a GROUP nested in the current chapter.
CHAPTER_TITLES = [
    "Philosophy",
    "Frequently Asked Questions",
    "Game Mechanics",
    "User Interface",
    "Retorts",
    "Common Units",
    "Buildings",
    "Races",
    "Heroes",
    "Item Powers",
    "Spells",
    "Encounter Zones",
    "Diplomacy",
    "AI",
    "Difficulty",
    "Known Bugs",
    "Modding",
]
CHAPTER_SET = {t.lower() for t in CHAPTER_TITLES}

# Chapters that yield entities. Used by the unclaimed-text report: in these, body
# text sitting after the first entity but attached to none is a defect. The rest
# are prose and attach to their chapter.
ENTITY_CHAPTERS = {
    "Retorts", "Common Units", "Buildings", "Races", "Heroes",
    "Item Powers", "Spells",
}

# Expected entity counts. These are assertions, not thresholds -- see
# Manual/SPEC.md, "Extraction contract". If one fails, the parser or the count is
# wrong. Fix the defect; never relax the number.
#
# Every count below was confirmed by a second, structurally different method --
# see the note beside each.
EXPECTED = {
    "chapters": len(CHAPTER_TITLES),
    "races": 14,           # size-5 underlined-bold headings under Arcanus + Myrror
    # 234, not 233: Arcane 14 + five realms x (Common 10, Uncommon 10, Rare 12,
    # Very Rare 12) = 14 + 220. All five realms landing on an identical rarity
    # split is the corroboration -- an earlier grep-based count said 233 because
    # one heading splits across lines and adjacency matching missed it.
    "spell_entries": 234,
    # Entries detected by the *global* style rule (size 4, bold + underlined):
    # 234 spells + 38 item powers + 1 mechanics block (Outpost Growth).
    "entries_total": 273,
    "retorts": 18,               # all 18 match "Name (cost)"; no leftover bold leads
    # 38, not 37: "Lightning" is a bold+underlined red heading that sits
    # mid-paragraph, glued to the tail of Flaming's effect text, so a classifier
    # reading only each paragraph's leading run never saw it. Corroborated three
    # ways -- 38 "Books required" lines, 38 "Create Artifact required" lines, and
    # realm groups of 9 Chaos + 9 Death + 7 Nature + 6 Life + 7 Sorcery.
    "item_powers": 38,
    # 37 bold size-4 name blocks, each with exactly one "Effect :" line. Two of
    # them -- Housing and Trade Goods -- have no Cost line; they are perpetual
    # production options rather than constructible buildings, and are modelled
    # separately so the buildings list is the 35 things a dependency tree can hold.
    "buildings": 35,
    "production_options": 2,
    "building_trees": 7,
    # 12 "-Name (cost) :" stat lines, plus Engineers, which the manual names in five
    # races and in Builder's Hall but never describes. Both numbers are asserted so
    # the stat-line count stays a real signal.
    "common_unit_stat_lines": 12,
    "common_units": 13,
    # 42 "Name (cost, building) :" lines. Corroborated by the collision SPEC.md
    # calls out independently: "Priests" resolves to exactly four racial units
    # (High Men, Nomad, Beastmen, Dark Elf).
    "racial_units": 42,
    "hero_abilities": 24,        # New 10 + Old 14, each with a "Type :" field
    "hero_types": 35,            # each with "Type :" and "Fame :" fields
    "item_power_limits": 9,      # Vials, Attack, Defense, To Hit, ... Health (new)
    # 48, not the 39 that keying on 'Creature :' finds -- the manual labels summon
    # stat blocks six different ways and twice not at all. Corroborated by a second,
    # structurally different method that ignores labels entirely: spell effect lines
    # carrying six or more number-first stat tokens. Both methods return the same 48
    # with no set difference, and both reject the one prose false positive.
    "summoned_creatures": 48,
}

# PER-CHAPTER CONVENTIONS -- the single most important thing to know about this
# source. There is NO global entry rule. Each chapter marks its entries
# differently, and two chapters cannot be detected by style at all:
#
#   Spells         size 4, bold + underline, realm-coloured, numbered
#   Item Powers    size 4, bold + underline, realm-coloured
#   Races          size 5, bold + underline
#   Retorts        size 4, BOLD ONLY; body shares the heading paragraph
#                  in a font-weight:normal span
#   Buildings      size 4, BOLD ONLY, and stylistically identical to their
#                  own field lines -- must be detected by content: a heading
#                  is a bold size-4 paragraph that does NOT match
#                  ^(Cost|Effect|Required by|Requires|Special)\s*:
#   Hero Abilities size 4, UNDERLINE ONLY, with every field in one paragraph
#   Hero Types     separated by <br>. Note the FAQ chapter also uses
#                  underline-only size 4 for its questions, so this rule must
#                  be scoped to the Heroes chapter.
#   Common Units   no heading markup at all; plain body lines shaped
#                  "-Name (cost) : stats"
#   Racial units   same, but "Name (cost, building) : stats", inside a race
#
# Two chapters also need the *hierarchy* overridden -- see annotate().

# Realm colours. Spells and item powers use different palettes for the same five
# realms, so one shared map would be wrong.
SPELL_REALM_BY_COLOR = {
    "#ff3333": "chaos",
    "#9966cc": "death",
    "#00ae00": "nature",
    "#0099ff": "sorcery",
    "#b3b3b3": "life",
}
ITEM_REALM_BY_COLOR = {
    "#ff3300": "chaos",
    "#9933ff": "death",
    "#009900": "nature",
    "#3399ff": "sorcery",
    "#b3b3b3": "life",
}
REALM_GROUP_RE = re.compile(r"^(Chaos|Death|Nature|Life|Sorcery)(\s+Powers)?$", re.I)

# Spelling corrections applied to building *references*. The manual spells a few
# building names inconsistently; the corrected form follows the possessive-guild
# style the Buildings chapter uses for every other guild. Nothing is silently
# rewritten -- each application is recorded in the emitted `name_corrections`
# list, keeping the manual's literal text alongside.
NAME_CORRECTIONS = {
    # Written once, in Library's 'Required by'. The apostrophe is simply missing.
    "alchemist guild": "Alchemist's Guild",
    # Written once, in Lizardmen's forbidden buildings. A leftover of the base
    # game's naval naming, which CoM2 collapsed to Ship Yard plus Maritime Guild.
    # Unlike the entry above, the target is not recoverable from the manual --
    # this mapping is the maintainer's, and the correction log records it.
    "ship wringhts guild": "Ship Yard",
}

# The same, for ability names. Kept separate from NAME_CORRECTIONS because the two
# are asserted differently -- a building correction must resolve to a real building.
ABILITY_CORRECTIONS = {
    # Written once, on the Sky Drake; twelve other creatures write the singular.
    # Left alone, a filter for "immune to illusions" silently misses that one unit.
    "illusions immunity": "Illusion Immunity",
}

# Named in the manual -- five races list it among their permitted common units and
# Builder's Hall unlocks it -- but the Common Units chapter has no entry for it.
# Included by name so those cross-links resolve, with no stats, because the manual
# states none (SPEC.md, source authority: where the manual is silent, so is the page).
UNDESCRIBED_COMMON_UNITS = ["Engineers"]

# Unit stat vocabulary. A stat token is written number-first ("7 Melee"); an
# ability is not, even when it carries a rating ("Caster 20", "Scouting 2"). That
# ordering is the whole discriminator between the two.
#
# Attack types are deliberately NOT collapsed into one "attack" key -- melee,
# thrown, ranged, magical ranged and the breath attacks are different mechanics.
# The only normalisation is of spelling variants: the Common Units chapter writes
# "attack" where the racial units write "Melee", and singular "figure" appears once.
STAT_KEYS = {
    "melee": "melee",
    "attack": "melee",
    "defense": "defense",
    "health": "health",
    "movement": "movement",
    "resistance": "resistance",
    "figures": "figures",
    "figure": "figures",
    "to hit": "to_hit",
    "to defend": "to_defend",
    "ammo": "ammo",
    "ranged": "ranged",
    "magical ranged": "magical_ranged",
    "thrown": "thrown",
    "fire breath": "fire_breath",
    "lightning breath": "lightning_breath",
}

# Present on every unit that has a stat line, so a parse regression fails loudly
# instead of quietly yielding a shorter stat block.
UNIVERSAL_STATS = ("defense", "health", "movement", "resistance")

STAT_TOKEN_RE = re.compile(r"^([+-]?)\s*(\d+)\s*(%?)\s+(.+)$")
AMMO_RE = re.compile(r"\((\d+)\s*ammo\)", re.I)
# Summoned-creature lines sometimes omit the comma before the To Hit bonus, fusing
# it onto the attack: '20 Ranged (3 ammo) +20% To Hit'. Split it back off.
TO_HIT_SUFFIX_RE = re.compile(r"([+-]?)\s*(\d+)\s*%\s*to\s+hit\s*$", re.I)

# Subjects that can take a shared "Immunity" head. The manual spells immunities out
# in full for every unit except one -- the Dwarf Golem -- which uses a shared-head
# list where the trailing "Immunity" distributes over the bare subjects before it:
#
#   Resist Elements, Poison, Death, Stoning, Fire, Cold Immunity, Wall Crusher
#                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^ all Immunity
#
# Read literally, a bare "Poison" would be a poison *attack* -- which is exactly what
# it means everywhere else in the manual ("Poison 4" on Manticores) -- so leaving the
# bare form in place would assert an attack the unit does not have.
IMMUNITY_SUBJECTS = {"poison", "death", "stoning", "fire", "cold",
                     "missile", "weapon", "magic"}

# "Illusion" is deliberately excluded above and may never take part in an expansion.
# Bare "Illusion" is an ability in its own right -- it makes a unit's attacks
# illusionary -- and Phantom Warriors and Phantom Beast both carry it, both with 0
# defense. Expanding it would invent an immunity and destroy a real ability. Nothing
# is lost by the exclusion: every creature that genuinely is immune writes
# "Illusion Immunity" out in full.
NEVER_EXPANDED = {"illusion"}
assert not (IMMUNITY_SUBJECTS & NEVER_EXPANDED)


# --------------------------------------------------------------------------
# Tokenizer
# --------------------------------------------------------------------------

@dataclass
class Run:
    """A contiguous piece of text sharing one computed style."""
    text: str
    size: int = 3
    bold: bool = False
    underline: bool = False
    strike: bool = False
    color: str | None = None


@dataclass
class Para:
    """One <p> (or <li>) worth of runs."""
    runs: list[Run] = field(default_factory=list)
    line: int = 0

    @property
    def raw(self) -> str:
        """Normalized text with BR markers intact."""
        return normalize_ws("".join(r.text for r in self.runs))

    @property
    def text(self) -> str:
        """Single-line text -- BR markers flattened to spaces."""
        return normalize_ws(self.raw.replace(BR, " "))

    @property
    def lines(self) -> list[str]:
        """The paragraph's true lines, split on <br>."""
        return [s for s in (normalize_ws(x) for x in self.raw.split(BR)) if s]

    def lead(self) -> Run | None:
        """First run with visible text -- the one that decides classification."""
        for r in self.runs:
            if r.text.strip() and r.text != BR:
                return r
        return None

    def strike_texts(self) -> list[str]:
        """Struck-through fragments. In the Races chapter these mean
        'this race cannot build this' (Manual/SPEC.md)."""
        out, cur = [], []
        for r in self.runs:
            if r.strike:
                cur.append(r.text)
            elif cur:
                out.append(normalize_ws("".join(cur)).replace(BR, " ").strip())
                cur = []
        if cur:
            out.append(normalize_ws("".join(cur)).replace(BR, " ").strip())
        return [s for s in out if s]


def normalize_ws(s: str) -> str:
    """Collapse whitespace, keeping BR markers and trimming space around them."""
    s = re.sub(r"\s+", " ", s.replace("\xa0", " "))
    s = re.sub(r" *\x00 *", BR, s)
    return s.strip().strip(BR).strip()


class ManualTokenizer(HTMLParser):
    """Emit paragraphs of styled runs.

    Style is computed from the open-tag stack rather than tag adjacency, so all
    the heading markup variants collapse to the same representation. Inline
    ``font-weight: normal`` / ``text-decoration: none`` cancel an enclosing
    <b>/<u>; OpenOffice relies on that to put body text inside a bold heading
    element (the Retorts pattern).
    """

    BLOCK = {"p", "li"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, dict]] = []
        self.paras: list[Para] = []
        self._cur: Para | None = None

    # -- style resolution ------------------------------------------------
    def _style(self) -> Run:
        size, color = 3, None
        bold = underline = strike = False
        for tag, attrs in self.stack:
            style = (attrs.get("style") or "").lower()
            if tag == "font":
                if attrs.get("size"):
                    try:
                        size = int(attrs["size"])
                    except ValueError:
                        pass
                if attrs.get("color"):
                    color = attrs["color"].lower()
            elif tag == "b":
                bold = True
            elif tag == "u":
                underline = True
            elif tag == "strike":
                strike = True
            if "font-weight: normal" in style:
                bold = False
            if "text-decoration: none" in style:
                underline = False
            if "font-weight: bold" in style:
                bold = True
        return Run("", size, bold, underline, strike, color)

    # -- HTMLParser hooks ------------------------------------------------
    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag in self.BLOCK:
            self._flush()
            self._cur = Para(line=self.getpos()[0])
        elif tag == "br" and self._cur is not None:
            s = self._style()
            s.text = BR
            self._cur.runs.append(s)
        if tag not in ("br", "img", "meta", "hr"):
            self.stack.append((tag, a))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break
        if tag in self.BLOCK:
            self._flush()

    def handle_data(self, data):
        if self._cur is None or not data:
            return
        s = self._style()
        s.text = data
        self._cur.runs.append(s)

    def _flush(self):
        if self._cur is not None:
            if any(r.text.strip() for r in self._cur.runs):
                self.paras.append(self._cur)
            self._cur = None

    def close(self):
        super().close()
        self._flush()


# --------------------------------------------------------------------------
# Classification
# --------------------------------------------------------------------------

CHAPTER, GROUP, SECTION, ENTRY, BODY = "chapter", "group", "section", "entry", "body"


def is_entry_run(r: Run) -> bool:
    """Size-4 bold+underlined: the global entry-heading style."""
    return r.bold and r.underline and r.size == 4 and bool(r.text.strip())


def split_mid_paragraph_headings(paras: list[Para]) -> list[Para]:
    """Break a paragraph apart where an entry heading starts mid-paragraph.

    OpenOffice occasionally leaves an entry heading glued to the tail of the
    previous entry's body inside one <p>. Classifying by the leading run then
    drops the heading silently -- this is exactly how "Lightning" went missing
    from the item powers.

    The split point is a *style transition*: an entry-styled run that follows
    visible non-entry-styled text in the same paragraph. That distinction
    matters, because a single heading is itself often several entry-styled runs
    ("9" + "." + "Disjunction") and must not be split. Document-wide this fires
    exactly once.
    """
    out = []
    for p in paras:
        cuts, seen_body = [], False
        for i, r in enumerate(p.runs):
            if not r.text.strip() or r.text == BR:
                continue
            if is_entry_run(r):
                if seen_body:
                    cuts.append(i)
            else:
                seen_body = True
        if not cuts:
            out.append(p)
            continue
        for start, end in zip([0] + cuts, cuts + [len(p.runs)]):
            chunk = p.runs[start:end]
            if any(r.text.strip() for r in chunk):
                out.append(Para(runs=chunk, line=p.line))
    return out


def base_classify(p: Para) -> str:
    """Level of a paragraph, from the style of its leading run.

    chapter  size >= 6, bold, title in CHAPTER_TITLES
    group    size >= 6, bold, anything else (realm, plane, hero-ability era)
    section  size == 5, bold (rarity tier, race name)
    entry    size == 4, bold AND underlined
    body     everything else

    Underline is what separates an entry heading from an ordinary bold stat
    line (spell 'Cost :' / 'Research :' lines are bold at size 4 but not
    underlined).
    """
    lead = p.lead()
    if lead is None:
        return BODY
    if lead.bold and lead.size >= 6:
        return CHAPTER if p.text.strip().lower() in CHAPTER_SET else GROUP
    if lead.bold and lead.size == 5:
        return SECTION
    if is_entry_run(lead):
        return ENTRY
    return BODY


def is_realm_group(p: Para) -> bool:
    """An Item Powers realm heading: size-4 bold and realm-coloured, no underline."""
    lead = p.lead()
    return bool(
        lead and lead.bold and not lead.underline and lead.size == 4
        and lead.color in ITEM_REALM_BY_COLOR
        and REALM_GROUP_RE.match(p.text.strip())
    )


def annotate(paras: list[Para]) -> list[tuple[Para, str, str | None]]:
    """(paragraph, level, chapter) for every paragraph.

    Two chapters override the size-based hierarchy, because the source's font
    sizes contradict the structure its own table of contents states:

      Heroes       'Old' is size 6 -- which would make it a group -- but it is
                   the sibling of the size-5 'New'. Left alone, 'Hero Types'
                   ends up nested inside 'Old'. The TOC lists 'Hero abilities'
                   and 'Hero types' as the chapter's two divisions.
      Item Powers  the five realm headings are size-4 bold and coloured with no
                   underline, so the size rule sees them as body and all 38
                   powers collapse into the preceding 'Health (new)' section.
    """
    out, chapter = [], None
    for p in paras:
        kind = base_classify(p)
        if kind == CHAPTER:
            chapter = p.text.strip()
        elif chapter == "Heroes":
            t = p.text.strip().lower()
            if t in ("hero abilities", "hero types"):
                kind = GROUP
            elif t in ("new", "old"):
                kind = SECTION
        elif chapter == "Item Powers" and kind == BODY and is_realm_group(p):
            kind = GROUP
        out.append((p, kind, chapter))
    return out


def classify(p: Para) -> str:
    """Context-free level. Prefer annotate() -- two chapters need context."""
    return base_classify(p)


# --------------------------------------------------------------------------
# Document build
# --------------------------------------------------------------------------

def load_paras() -> list[Para]:
    if not SRC.exists():
        die(f"source manual not found: {SRC}")
    raw = SRC.read_bytes().decode("shift_jis")
    tk = ManualTokenizer()
    tk.feed(raw)
    tk.close()
    return split_mid_paragraph_headings(tk.paras)


def cut_changelog(paras: list[Para]) -> tuple[list[Para], int]:
    # Matched on size alone, not boldness: the 'Version History' heading is size 7
    # but *not* bold (its paragraph carries font-weight: normal), so it does not
    # classify as a CHAPTER.
    for i, p in enumerate(paras):
        lead = p.lead()
        if lead and lead.size >= 6 and p.text.strip().lower().startswith(CHANGELOG_HEADING):
            return paras[:i], i
    die(f"could not find the '{CHANGELOG_HEADING}' chapter heading -- "
        "refusing to guess where the changelog starts")


def new_node(title, line):
    return {"title": title, "line": line, "body": [], "children": [], "entries": []}


def build_tree(annotated) -> dict:
    """Structural tree: chapter -> group -> section -> entry -> body paragraphs."""
    doc = {"chapters": [], "preamble": []}
    chapter = group = section = entry = None

    for p, kind, _ch in annotated:
        text = p.text
        if kind == CHAPTER:
            chapter = new_node(text, p.line)
            doc["chapters"].append(chapter)
            group = section = entry = None
        elif kind == GROUP:
            if chapter is None:
                continue
            group = new_node(text, p.line)
            chapter["children"].append(group)
            section = entry = None
        elif kind == SECTION:
            parent = group or chapter
            if parent is None:
                continue
            section = new_node(text, p.line)
            parent["children"].append(section)
            entry = None
        elif kind == ENTRY:
            parent = section or group or chapter
            if parent is None:
                continue
            lead = p.lead()
            entry = new_node(text, p.line)
            entry["color"] = lead.color if lead else None
            parent["entries"].append(entry)
            # Retorts pattern: bold heading and normal-weight body share one
            # paragraph. Split them so the title is just the heading.
            tail = normalize_ws(
                "".join(r.text for r in p.runs if not r.bold)).replace(BR, " ").strip()
            if tail:
                entry["title"] = normalize_ws(
                    "".join(r.text for r in p.runs if r.bold)).replace(BR, " ").strip()
                entry["body"].append(tail)
        else:
            b = entry or section or group or chapter
            if b is None:
                if text:
                    doc["preamble"].append(text)
                continue
            b["body"].append(text)
            struck = p.strike_texts()
            if struck:
                b.setdefault("struck", []).extend(struck)
    return doc


def walk(node):
    """Yield every group/section node beneath `node`, depth-first."""
    for c in node.get("children", []):
        yield c
        yield from walk(c)


def count_entries(node) -> int:
    return len(node.get("entries", [])) + sum(
        len(c.get("entries", [])) for c in walk(node))


def find_chapter(doc, title):
    for c in doc["chapters"]:
        if c["title"].strip().lower() == title.lower():
            return c
    return None


def chapter_slices(annotated) -> dict[str, list]:
    """chapter title -> its annotated paragraphs (heading excluded)."""
    out, cur = defaultdict(list), None
    for item in annotated:
        p, kind, _ = item
        if kind == CHAPTER:
            cur = p.text.strip()
            continue
        if cur:
            out[cur].append(item)
    return out


# --------------------------------------------------------------------------
# Field parsing helpers
# --------------------------------------------------------------------------

FIELD_RE = re.compile(r"^(Cost|Effect|Required by|Requires|Special)\s*:", re.I)
RETORT_RE = re.compile(r"^(.+?)\s*\((\d+)\)$")
COMMON_UNIT_RE = re.compile(r"^-\s*(.+?)\s*\((\d+)\)\s*:\s*(.*)$")
RACIAL_UNIT_RE = re.compile(r"^([A-Z][A-Za-z' ]+?)\s*\(\s*(\d+)\s*,\s*([^)]+)\)\s*:\s*(.*)$")
SPELL_TITLE_RE = re.compile(r"^(\d+)\s*\.\s*(.+)$")
ARROW_RE = re.compile(r"\s*(?:→|->)\s*")


def field_value(lines: list[str], *names: str) -> str | None:
    """First line matching 'Name : value', returned as the value."""
    pat = re.compile(rf"^(?:{'|'.join(names)})\s*:\s*(.*)$", re.I)
    for ln in lines:
        m = pat.match(ln)
        if m:
            return m.group(1).strip() or None
    return None


def other_lines(lines: list[str], *names: str) -> list[str]:
    """Lines that are not one of the named fields."""
    pat = re.compile(rf"^(?:{'|'.join(names)})\s*:", re.I)
    return [ln for ln in lines if not pat.match(ln)]


def split_list(s: str | None) -> list[str]:
    """Comma/'and'-separated list. '-' is how the manual writes 'none'."""
    if not s or s.strip() in ("-", "--"):
        return []
    return [x.strip(" .") for x in re.split(r",| and ", s) if x.strip(" .")]


def parse_stats(text: str | None) -> tuple[dict, list[str], list[str]]:
    """Split a unit stat line into numeric stats, abilities, and unknown tokens.

    '7 Melee, 3 Thrown, +10% To Hit, 3 Defense, ... 6 Figures, 3 Health. Pathfinding.'
      -> {'melee': 7, 'thrown': 3, 'to_hit': 10, 'defense': 3, ...}, ['Pathfinding']

    Number-first tokens are stats; everything else is an ability, which is why
    'Caster 20' and 'Scouting 2' stay abilities despite carrying a number. Ammo is
    written either as its own token ('4 Ammo') or parenthesised inside the attack
    ('3 Ranged (8 ammo)'); both land on the same key.

    Unknown tokens are returned rather than guessed at, and are asserted empty --
    a stat name this vocabulary does not cover must not silently become an ability.
    """
    if not text:
        return {}, [], []
    stats: dict[str, int] = {}
    abilities: list[str] = []
    unknown: list[str] = []
    for tok in re.split(r"[,.]", text):
        tok = tok.strip()
        if not tok:
            continue
        m = STAT_TOKEN_RE.match(tok)
        if not m:
            abilities.append(tok)
            continue
        sign, digits, _pct, name = m.groups()
        value = int(digits) * (-1 if sign == "-" else 1)
        name = name.strip().lower()
        ammo = AMMO_RE.search(name)
        if ammo:
            stats["ammo"] = int(ammo.group(1))
            name = AMMO_RE.sub("", name).strip()
        fused = TO_HIT_SUFFIX_RE.search(name)
        if fused:
            stats["to_hit"] = int(fused.group(2)) * (-1 if fused.group(1) == "-" else 1)
            name = TO_HIT_SUFFIX_RE.sub("", name).strip()
        key = STAT_KEYS.get(name)
        if key:
            stats[key] = value
        else:
            unknown.append(tok)
    return stats, abilities, unknown


def apply_corrections(names: list[str], table: dict, kind: str,
                      where: str, log: list) -> list[str]:
    """Substitute from a correction table, recording every substitution made."""
    out = []
    for n in names:
        fixed = table.get(n.lower().strip())
        if fixed:
            log.append({"in_manual": n, "corrected_to": fixed,
                        "kind": kind, "where": where})
            out.append(fixed)
        else:
            out.append(n)
    return out


def correct_names(names: list[str], where: str, log: list) -> list[str]:
    """Correct building references."""
    return apply_corrections(names, NAME_CORRECTIONS, "building", where, log)


def correct_abilities(names: list[str], where: str, log: list) -> list[str]:
    """Correct ability names."""
    return apply_corrections(names, ABILITY_CORRECTIONS, "ability", where, log)


def expand_shared_immunity(abilities: list[str], where: str, log: list) -> list[str]:
    """Distribute a trailing 'Immunity' over the bare subjects preceding it.

    A run of bare subjects closed by an explicit '<subject> Immunity' is expanded:

        Poison, Death, Stoning, Fire, Cold Immunity   -> all Immunity
        Illusion, Poison Immunity, Death Immunity     -> untouched

    The second case is held back by NEVER_EXPANDED rather than by any threshold on
    run length: 'Illusion' is named there explicitly, so it can never be expanded
    however it appears. A rated attack ('Poison 4') and a fully-spelled list are
    both left alone by the shape of the rule itself.
    """
    out, i = list(abilities), 0
    while i < len(out):
        if out[i].lower() not in IMMUNITY_SUBJECTS:
            i += 1
            continue
        j = i
        while j < len(out) and out[j].lower() in IMMUNITY_SUBJECTS:
            j += 1
        if j < len(out) and out[j].lower().endswith(" immunity"):
            for k in range(i, j):
                fixed = f"{out[k]} Immunity"
                log.append({"in_manual": out[k], "corrected_to": fixed,
                            "kind": "ability", "where": where})
                out[k] = fixed
        i = j + 1
    return out


def dash_none(s: str | None) -> str | None:
    """'-' is how the manual writes an absent value."""
    return None if not s or s.strip() in ("-", "--") else s.strip()


def split_starred(s: str | None) -> tuple[list[str], list[str]]:
    """Split a hero's ability list, separating out the '*'-suffixed names.

    A trailing '*' marks the **Super** variant of that hero ability, which pairs
    with the 'Super : Available' field on the ability itself. The manual prints
    the marker but never gives a legend for it -- every other '*' in the document
    is a multiplication operator -- so the meaning comes from the maintainer, not
    from the source. The marker itself is the manual's.
    """
    names, starred = [], []
    for raw in split_list(s):
        clean = raw.rstrip("* ").strip()
        if not clean:
            continue
        names.append(clean)
        if "*" in raw:
            starred.append(clean)
    return names, starred


def parse_int(s: str | None) -> int | None:
    if not s:
        return None
    m = re.search(r"-?\d+", s.replace(",", ""))
    return int(m.group()) if m else None


def cost_range(s: str | None) -> tuple[int | None, int | None]:
    """'30 MP' -> (30, 30); '10-50 MP' -> (10, 50); 'Variable MP' -> (None, None).

    Variable-cost spells state a range; the page has to sort on something, so
    both ends are kept rather than collapsing to one number.
    """
    if not s:
        return None, None
    nums = [int(n) for n in re.findall(r"\d+", s.replace(",", ""))]
    if not nums:
        return None, None
    return nums[0], nums[-1] if len(nums) > 1 else nums[0]


def split_by_underlined(items) -> list[tuple[str, list[str], int]]:
    """Split an annotated paragraph range at underlined size-4 runs.

    Handles the Heroes / Item Powers / Spells shape where an entry's name and all
    of its fields live inside one paragraph separated by <br>, and also the case
    where an entry's body spills into following paragraphs (hero ability
    'Extra MP').

    Returns (name, lines, source_line) per entry.
    """
    out, name, buf, line = [], None, [], 0

    def flush():
        if name is not None:
            out.append((name, [s for s in (normalize_ws(x)
                                           for x in "".join(buf).split(BR)) if s], line))

    for p, kind, _ch in items:
        if kind in (CHAPTER, GROUP, SECTION):
            continue
        for r in p.runs:
            if r.underline and r.size == 4 and r.text.strip() and r.text != BR:
                flush()
                name = normalize_ws(r.text).replace(BR, " ").strip()
                buf, line = [], p.line
            elif name is not None:
                buf.append(r.text)
        if name is not None:
            buf.append(BR)
    flush()
    return out


# --------------------------------------------------------------------------
# Per-chapter extraction
# --------------------------------------------------------------------------
# Each extractor marks the paragraphs it consumed via `claimed`, so the
# unclaimed-text report can tell entity text from orphaned text.

def extract_retorts(items, claimed) -> list[dict]:
    """Size-4 bold-only headings shaped 'Name (pick cost)'.

    Two markup patterns: the heading and its body share one paragraph (with the
    body in a font-weight:normal span), or the heading stands alone and the body
    follows in plain paragraphs. Splitting on the heading run covers both.
    """
    out, cur = [], None
    for p, kind, _ch in items:
        lead = p.lead()
        head = (lead and lead.bold and lead.size == 4
                and RETORT_RE.match(normalize_ws(lead.text).replace(BR, " ").strip()))
        if head:
            cur = {"name": head.group(1).strip(), "pick_cost": int(head.group(2)),
                   "effect": [], "line": p.line}
            out.append(cur)
            tail = normalize_ws("".join(
                r.text for r in p.runs if not r.bold)).replace(BR, " ").strip()
            if tail:
                cur["effect"].append(tail)
            claimed.add(id(p))
        elif cur is not None and p.text:
            cur["effect"].append(p.text)
            claimed.add(id(p))

    for r in out:
        blob = " ".join(r["effect"])
        r["mutually_exclusive_with"] = re.findall(
            r"[Mm]utually exclusive with ([A-Z][A-Za-z]*)", blob)
    return out


def extract_buildings(items, claimed, corrections) -> tuple[list[dict], list[dict], list[dict]]:
    """Buildings, production options, and the dependency trees.

    Building headings are size-4 bold and stylistically identical to their own
    'Cost :' / 'Effect :' field lines, so they are detected by content instead.
    Housing and Trade Goods carry an Effect but no Cost -- they are perpetual
    production options, not constructible buildings, and are returned separately.
    """
    blocks, trees, cur, tree = [], [], None, None
    for p, kind, _ch in items:
        lead = p.lead()
        if lead and lead.underline and not lead.bold and lead.size == 4:
            cur = None
            tree = {"name": p.text.strip(), "edges": [], "line": p.line}
            trees.append(tree)
            claimed.add(id(p))
            continue
        if tree is not None and ARROW_RE.search(p.text):
            left, right = ARROW_RE.split(p.text, maxsplit=1)
            tree["edges"].append({
                "requires": [x.strip(" .") for x in re.split(r"\+| and ", left) if x.strip(" .")],
                # 'Library -> Sage's Guild, Linking Tower and Alchemist's Guild'
                # separates the last item with 'and', not a comma.
                "unlocks": correct_names(split_list(right), f"tree '{tree['name']}'",
                                         corrections),
            })
            claimed.add(id(p))
            continue
        if lead and lead.bold and lead.size == 4 and not FIELD_RE.match(p.text):
            cur = {"name": p.text.strip(), "lines": [], "line": p.line}
            blocks.append(cur)
            claimed.add(id(p))
        elif cur is not None and p.text:
            cur["lines"].append(p.text)
            claimed.add(id(p))

    buildings, options = [], []
    for b in blocks:
        cost_raw = field_value(b["lines"], "Cost")
        effect = field_value(b["lines"], "Effect")
        notes = other_lines(b["lines"], "Cost", "Effect", "Required by", "Requires", "Special")
        rec = {
            "name": b["name"],
            "cost": parse_int(cost_raw),
            # 'Cost :68, 4 gold/turn' -- the second number is the gold upkeep.
            "upkeep": parse_int(cost_raw.split(",", 1)[1]) if cost_raw and "," in cost_raw else None,
            "cost_text": cost_raw,
            "effect": effect,
            "required_by": correct_names(
                split_list(field_value(b["lines"], "Required by")),
                f"building '{b['name']}' / Required by", corrections),
            "special": field_value(b["lines"], "Special"),
            "notes": notes,
            "line": b["line"],
        }
        (options if rec["cost"] is None else buildings).append(rec)

    # 'requires' is stated only in the dependency trees, never on the entry.
    by_name = {b["name"].lower(): b for b in buildings}
    for b in buildings:
        b["requires"] = []
    for t in trees:
        for e in t["edges"]:
            for u in e["unlocks"]:
                tgt = by_name.get(u.lower())
                if tgt is not None:
                    tgt["requires"] = sorted(set(tgt["requires"]) | set(e["requires"]))
    for rec in options:
        rec.pop("required_by", None)
        rec.pop("special", None)
        rec["constructible"] = False
    return buildings, options, trees


def extract_common_units(items, claimed) -> list[dict]:
    """Plain body lines shaped '-Name (cost) : stats'. No heading markup at all."""
    out = []
    for p, kind, _ch in items:
        m = COMMON_UNIT_RE.match(p.text)
        if m:
            out.append({"name": m.group(1).strip(), "cost": int(m.group(2)),
                        "stats": m.group(3).strip(), "described": True,
                        "line": p.line})
            claimed.add(id(p))
    # Units the manual names elsewhere but never gives a stat line for. Carried so
    # cross-links from races and buildings resolve; `described` is what a renderer
    # keys on to avoid promising stats that do not exist.
    for name in UNDESCRIBED_COMMON_UNITS:
        out.append({"name": name, "cost": None, "stats": None,
                    "described": False, "line": None})
    return out


def extract_races(items, claimed, corrections) -> tuple[list[dict], list[dict]]:
    """One record per race, plus a flat list of racial units.

    Within a race section: bold size-4 runs are the race modifiers, struck runs
    are the buildings the race cannot build, 'Name (cost, building) : stats'
    lines are its unique units, and the first remaining plain paragraph lists the
    common units it may build followed by its modifiers to them.
    """
    races, units, plane, cur = [], [], None, None
    for p, kind, _ch in items:
        if kind == GROUP:
            plane = p.text.strip()
            continue
        if kind == SECTION:
            cur = {"name": p.text.strip(), "plane": plane, "modifiers": [],
                   "forbidden_buildings": [], "common_units": [],
                   "unit_modifiers": [], "unique_units": [], "notes": [],
                   "line": p.line}
            races.append(cur)
            continue
        if cur is None:
            continue
        claimed.add(id(p))

        struck = p.strike_texts()
        cur["forbidden_buildings"].extend(struck)
        # Bold non-struck runs are stat modifiers; they can share a paragraph
        # with the first struck building name.
        bold = normalize_ws("".join(
            r.text for r in p.runs if r.bold and not r.strike))
        if bold:
            cur["modifiers"].extend(x for x in bold.split(BR) if x.strip())
            continue
        if struck:
            continue

        text = p.text
        m = RACIAL_UNIT_RE.match(text)
        if m:
            rec = {"name": m.group(1).strip(), "cost": int(m.group(2)),
                   "requires": correct_names(
                       split_list(m.group(3)),
                       f"racial unit '{m.group(1).strip()}'", corrections),
                   "stats": m.group(4).strip(),
                   "race": cur["name"], "line": p.line}
            units.append(rec)
            cur["unique_units"].append(rec["name"])
            continue
        if not cur["common_units"] and p.lines:
            cur["common_units"] = split_list(p.lines[0])
            cur["unit_modifiers"] = p.lines[1:]
        elif text:
            cur["notes"].append(text)

    for r in races:
        r["forbidden_buildings"] = correct_names(
            r["forbidden_buildings"], f"race '{r['name']}' / forbidden buildings",
            corrections)
    return races, units


def extract_heroes(items, claimed) -> tuple[list[dict], list[dict]]:
    """Hero abilities (by era) and hero types.

    Both use underline-only size-4 headings with every field in one paragraph
    split by <br>. The FAQ chapter uses the same markup for its questions, which
    is why this is scoped to the Heroes chapter.
    """
    by_div, div, sec = defaultdict(list), None, None
    for item in items:
        p, kind, _ch = item
        if kind == GROUP:
            div, sec = p.text.strip(), None
            continue
        if kind == SECTION:
            sec = p.text.strip()
            continue
        if div:
            by_div[(div, sec)].append(item)
            claimed.add(id(p))

    abilities, types = [], []
    for (division, section), group in by_div.items():
        for name, lines, line in split_by_underlined(group):
            if division.lower() == "hero abilities":
                abilities.append({
                    "name": name,
                    "era": section,
                    "type": field_value(lines, "Type"),
                    "super": field_value(lines, "Super"),
                    "effect": field_value(lines, "Effect")
                              or " ".join(other_lines(lines, "Type", "Super")) or None,
                    "line": line,
                })
            else:
                abil, super_abil = split_starred(field_value(lines, "Hero abilities"))
                types.append({
                    "name": name,
                    "type": field_value(lines, "Type"),
                    "fame": parse_int(field_value(lines, "Fame")),
                    "caster_level": dash_none(field_value(lines, "Caster Level")),
                    "spells": dash_none(field_value(lines, "Spells")),
                    "hero_abilities": abil,
                    # Those of the above the hero has at Super level ('*').
                    "super_abilities": super_abil,
                    "other_abilities": split_list(field_value(lines, "Other Abilities")),
                    "random_abilities": split_list(field_value(lines, "Random abilities")),
                    "line": line,
                })
    return abilities, types


def extract_item_powers(items, claimed) -> tuple[list[dict], list[dict]]:
    """Named item powers grouped by realm, plus the per-slot bonus limits.

    The limits are the size-5 sections that precede the realm groups (Attack,
    Defense, To Hit, ...); they state which equipment slots may carry which
    numeric bonus, and are what the page's inverted slot filter needs.
    """
    limits, powers, realm, sec, in_realms = [], [], None, None, False
    realm_items = defaultdict(list)
    for item in items:
        p, kind, _ch = item
        if kind == GROUP:
            realm = ITEM_REALM_BY_COLOR.get((p.lead().color if p.lead() else None))
            in_realms = True
            claimed.add(id(p))
            continue
        if kind == SECTION:
            sec = {"name": p.text.strip(), "rules": [], "line": p.line}
            limits.append(sec)
            continue
        if in_realms:
            realm_items[realm].append(item)
            claimed.add(id(p))
        elif sec is not None and p.text:
            sec["rules"].append(p.text)
            claimed.add(id(p))

    for r, group in realm_items.items():
        for name, lines, line in split_by_underlined(group):
            slots = [ln for ln in lines if re.search(r"\bonly\b", ln, re.I)]
            effect = [ln for ln in other_lines(
                lines, "Books required", "Required Books", "Create Artifact required")
                if ln not in slots]
            powers.append({
                "name": name,
                "realm": r,
                "books_required": parse_int(
                    field_value(lines, "Books required", "Required Books")),
                "create_artifact_required":
                    (field_value(lines, "Create Artifact required") or "").lower().startswith("y")
                    if field_value(lines, "Create Artifact required") else None,
                "slots": slots,
                "effect": effect,
                "line": line,
            })
    return powers, limits


def extract_spells(items, claimed) -> list[dict]:
    """Numbered, realm-coloured entries under realm group + rarity section."""
    out, realm, rarity = [], None, None
    for p, kind, _ch in items:
        if kind == GROUP:
            realm = p.text.strip().replace(" Magic", "").lower()
            rarity = None
            continue
        if kind == SECTION:
            rarity = p.text.strip()
            continue
        if kind == ENTRY:
            lead = p.lead()
            title = p.text.strip()
            m = SPELL_TITLE_RE.match(title)
            out.append({
                "number": int(m.group(1)) if m else None,
                "name": (m.group(2) if m else title).strip(),
                "realm": realm,
                "rarity": rarity,
                "color": lead.color if lead else None,
                "casting_cost": None, "upkeep": None,
                "research_cost": None, "effect": [], "line": p.line,
            })
            claimed.add(id(p))
        elif out and p.text:
            cur, t = out[-1], p.text
            if re.match(r"^Cost\s*:", t, re.I):
                v = re.sub(r"^Cost\s*:\s*", "", t, flags=re.I)
                # 'Cost : 30 MP, 1 MP/turn' -- the tail is a per-turn upkeep.
                if "/turn" in v:
                    head, _, tail = v.rpartition(",")
                    cur["casting_cost"], cur["upkeep"] = head.strip() or v, tail.strip()
                else:
                    cur["casting_cost"] = v.strip()
            elif re.match(r"^Research\s*:", t, re.I):
                cur["research_cost"] = re.sub(r"^Research\s*:\s*", "", t, flags=re.I).strip()
            else:
                cur["effect"].append(t)
            claimed.add(id(p))

    # Numeric forms for sorting. The raw strings stay -- they are what the manual
    # says, and 'Variable MP' / 'None' carry meaning a number cannot.
    for s in out:
        s["casting_mp_min"], s["casting_mp_max"] = cost_range(s["casting_cost"])
        s["research_rp"] = (None if (s["research_cost"] or "").strip().lower() == "none"
                            else parse_int(s["research_cost"]))
    return out


def extract_summoned_creatures(spells: list[dict]) -> list[dict]:
    """Fantastic units, pulled out of their summoning spell's effect text.

    The manual gives each summon a full stat line inside the spell entry, but
    labels it six different ways -- 'Creature :', 'Combat Creature :', 'Combat
    Summon :', 'Combat only summon :', 'Combat or Overland Creature :', and twice
    with no label at all. Keying on the obvious 'Creature :' finds only 39 of 48.

    Detection is therefore by *shape*, not label: a line counts when parsing it
    yields all four universal stats as real numbers. That rejects prose which
    merely mentions the words -- 'Mystic Surge' talks about movement, defense,
    resistance and health across three sentences, but none of them parse as
    number-first stat tokens.
    """
    out = []
    for s in spells:
        for raw in s["effect"]:
            m = re.match(r"^([^:]{0,45}):\s*(.*)$", raw)
            label, body = (m.group(1).strip(), m.group(2)) if m else ("", raw)
            stats, abilities, unparsed = parse_stats(body)
            if not all(k in stats for k in UNIVERSAL_STATS):
                continue
            low = label.lower()
            generic = low in ("creature", "combat creature", "combat summon",
                              "combat only summon", "combat or overland creature")
            # A non-generic label names the creature at its end, e.g. Lycanthropy's
            # 'Target normal unit turns into Werewolves'.
            named = None
            if label and not generic:
                trailing = re.search(r"([A-Z][A-Za-z']*(?:\s+[A-Z][A-Za-z']*)*)\s*$", label)
                named = trailing.group(1) if trailing else None
            if "combat or overland" in low:
                when = "combat_or_overland"
            elif "combat" in low:
                when = "combat"
            elif generic:
                when = "overland"
            else:
                when = None
            out.append({
                "name": named or s["name"],
                "summoned_by": s["name"],
                "realm": s["realm"],
                "rarity": s["rarity"],
                "summoned": when,
                "label_in_manual": label or None,
                "stats_text": body,
                "stats": stats,
                "abilities": abilities,
                "stats_unparsed": unparsed,
                "line": s["line"],
            })
    return out


def extract_all(annotated) -> tuple[dict, set]:
    """Every chapter's entities, plus the set of paragraph ids they consumed."""
    slices = chapter_slices(annotated)
    claimed: set[int] = set()
    corrections: list[dict] = []

    retorts = extract_retorts(slices["Retorts"], claimed)
    buildings, options, trees = extract_buildings(slices["Buildings"], claimed, corrections)
    common_units = extract_common_units(slices["Common Units"], claimed)
    races, racial_units = extract_races(slices["Races"], claimed, corrections)
    abilities, hero_types = extract_heroes(slices["Heroes"], claimed)
    item_powers, item_limits = extract_item_powers(slices["Item Powers"], claimed)
    spells = extract_spells(slices["Spells"], claimed)

    # A racial unit's parenthesised requirement list mixes buildings with terrain
    # conditions ("Carrak (80, Forester's Guild, sea access)"). Split them so
    # `requires` is purely buildings and the dependency graph stays clean.
    known = {b["name"].lower() for b in buildings + options}
    for u in racial_units:
        u["requires"], u["conditions"] = (
            [r for r in u["requires"] if r.lower() in known],
            [r for r in u["requires"] if r.lower() not in known],
        )

    # Stat lines are parsed for both unit kinds by one code path. The verbatim
    # string is kept as `stats_text` -- it is what the manual actually says, and
    # the page renders it.
    for u in common_units + racial_units:
        u["stats_text"] = u.pop("stats")
        u["stats"], u["abilities"], u["stats_unparsed"] = parse_stats(u["stats_text"])
        where = f"unit '{u['name']}' / abilities"
        u["abilities"] = correct_abilities(
            expand_shared_immunity(u["abilities"], where, corrections),
            where, corrections)

    summoned = extract_summoned_creatures(spells)
    for c in summoned:
        where = f"summoned '{c['name']}' / abilities"
        c["abilities"] = correct_abilities(
            expand_shared_immunity(c["abilities"], where, corrections),
            where, corrections)
    # Back-link each summoning spell to what it summons.
    by_spell: dict[str, list[str]] = defaultdict(list)
    for c in summoned:
        by_spell[c["summoned_by"]].append(c["name"])
    for s in spells:
        s["summons"] = by_spell.get(s["name"], [])

    return {
        "retorts": retorts,
        "buildings": buildings,
        "production_options": options,
        "building_trees": trees,
        "common_units": common_units,
        "races": races,
        "racial_units": racial_units,
        "hero_abilities": abilities,
        "hero_types": hero_types,
        "item_powers": item_powers,
        "item_power_limits": item_limits,
        "spells": spells,
        "summoned_creatures": summoned,
        "name_corrections": sorted(
            corrections, key=lambda c: (c["in_manual"], c["where"])),
    }, claimed


def build(annotated) -> dict:
    doc = {"version": "com2_1.05.11"}
    tree = build_tree(annotated)
    entities, _ = extract_all(annotated)
    doc["chapters"] = tree["chapters"]
    doc["preamble"] = tree["preamble"]
    doc["entities"] = entities
    return doc


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

def unclaimed(annotated, claimed: set) -> list[dict]:
    """Body text an entity-bearing chapter failed to attach to any entity.

    Manual/SPEC.md requires this to be empty: a silent drop is a defect. This is
    the check that would have caught the missing "Lightning" item power -- its
    effect text had no owner.

    Prose chapters have no entities, so their text attaches to the chapter and is
    claimed by definition. Within an entity chapter, only text *after* the first
    entity is in scope; a chapter's own introduction legitimately precedes it.
    Text attached to a style-detected ENTRY node is claimed too, which covers
    mechanics blocks like Common Units' "Outpost Growth".
    """
    out = []
    slices = chapter_slices(annotated)
    for chapter in sorted(ENTITY_CHAPTERS):
        items = slices[chapter]
        started = in_entry = False
        for p, kind, _ch in items:
            if kind == ENTRY:
                started = in_entry = True
                continue
            if kind in (GROUP, SECTION):
                in_entry = False
                continue
            if not started or in_entry or id(p) in claimed or not p.text:
                continue
            out.append({"chapter": chapter, "line": p.line, "text": p.text[:120]})
    return sorted(out, key=lambda x: x["line"])


def preamble_stray(annotated) -> list[dict]:
    """Text before the first chapter. The title block and TOC are expected."""
    out, seen = [], False
    for p, kind, _ch in annotated:
        if kind == CHAPTER:
            seen = True
            continue
        if not seen and p.text:
            out.append({"line": p.line, "text": p.text[:120]})
    return out


def census(annotated) -> dict:
    counts = Counter(kind for _p, kind, _ch in annotated)
    sizes = Counter()
    for p, _k, _ch in annotated:
        lead = p.lead()
        if lead and lead.bold:
            sizes[(lead.size, "u+b" if lead.underline else "b")] += 1

    doc = build(annotated)
    ent = doc["entities"]
    chapters = [c["title"] for c in doc["chapters"]]

    races_ch = find_chapter(doc, "Races")
    races = 0
    if races_ch:
        for plane in races_ch["children"]:
            if plane["title"].strip().lower() in ("arcanus", "myrror"):
                races += len(plane["children"])

    groups = {}
    for c in doc["chapters"]:
        for g in c["children"]:
            if g["children"] or g["entries"]:
                groups[f"{c['title']} / {g['title']}"] = count_entries(g)

    _, claimed = extract_all(annotated)
    return {
        "paragraphs": len(annotated),
        "by_kind": dict(counts),
        "bold_leads_by_size": {f"{k[0]}{k[1]}": v for k, v in sorted(sizes.items())},
        "chapters": chapters,
        "chapter_count": len(chapters),
        "entries_total": sum(count_entries(c) for c in doc["chapters"]),
        "entries_per_chapter": {c["title"]: count_entries(c) for c in doc["chapters"]},
        "entries_per_group": groups,
        "spell_entries": count_entries(find_chapter(doc, "Spells")),
        "race_sections": races,
        "entity_counts": {k: len(v) for k, v in ent.items()},
        "item_powers_by_realm": dict(Counter(p["realm"] for p in ent["item_powers"])),
        "spells_by_realm": dict(Counter(s["realm"] for s in ent["spells"])),
        "preamble_paragraphs": len(doc["preamble"]),
        "preamble_stray": preamble_stray(annotated),
        "unclaimed": unclaimed(annotated, claimed),
    }


def die(msg: str):
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(2)


def verify(annotated) -> int:
    c = census(annotated)
    ent = c["entity_counts"]
    doc = build(annotated)
    e = doc["entities"]
    failures = []

    def check(name, got, want):
        if got != want:
            failures.append(f"{name}: expected {want}, got {got}")

    check("chapters", c["chapter_count"], EXPECTED["chapters"])
    check("races", c["race_sections"], EXPECTED["races"])
    check("spell_entries", c["spell_entries"], EXPECTED["spell_entries"])
    check("entries_total", c["entries_total"], EXPECTED["entries_total"])
    for key in ("retorts", "buildings", "production_options", "building_trees",
                "common_units", "racial_units", "hero_abilities", "hero_types",
                "item_powers", "item_power_limits", "summoned_creatures"):
        check(key, ent[key], EXPECTED[key])
    check("races (entities)", ent["races"], EXPECTED["races"])
    check("spells (entities)", ent["spells"], EXPECTED["spell_entries"])
    check("common_unit_stat_lines",
          sum(1 for u in e["common_units"] if u["described"]),
          EXPECTED["common_unit_stat_lines"])

    # Structural checks: a count can be right while the fields behind it are not.
    ip_realms = Counter(p["realm"] for p in e["item_powers"])
    check("item powers with a realm", sum(ip_realms.values()) - ip_realms[None],
          EXPECTED["item_powers"])
    for want, realm in ((9, "chaos"), (9, "death"), (7, "nature"),
                        (6, "life"), (7, "sorcery")):
        check(f"item powers / {realm}", ip_realms[realm], want)

    no_cost = [s["name"] for s in e["spells"] if not s["casting_cost"]]
    if no_cost:
        failures.append(f"spells with no casting cost: {len(no_cost)} ({no_cost[:5]})")
    no_res = [s["name"] for s in e["spells"] if not s["research_cost"]]
    if no_res:
        failures.append(f"spells with no research cost: {len(no_res)} ({no_res[:5]})")
    no_books = [p["name"] for p in e["item_powers"] if p["books_required"] is None]
    if no_books:
        failures.append(f"item powers with no book requirement: {no_books}")
    no_type = [h["name"] for h in e["hero_types"] if not h["type"]]
    if no_type:
        failures.append(f"hero types with no Type field: {no_type}")
    no_ab_type = [h["name"] for h in e["hero_abilities"] if not h["type"]]
    if no_ab_type:
        failures.append(f"hero abilities with no Type field: {no_ab_type}")
    no_effect = [b["name"] for b in e["buildings"] if not b["effect"]]
    if no_effect:
        failures.append(f"buildings with no Effect field: {no_effect}")

    # Referential integrity, manual against itself. A name that stops resolving
    # is normally a parse regression. The exceptions below are the manual's own
    # inconsistencies, recorded so a real regression still shows up here.
    def key(s):
        return s.lower().rstrip("s").replace("'", "").strip()

    ability_names = {key(a["name"]) for a in e["hero_abilities"]}
    dangling = sorted({a for h in e["hero_types"] for a in h["hero_abilities"]
                       if key(a) not in ability_names})
    if dangling:
        failures.append(f"hero-type abilities not in the ability list: {dangling}")

    # Every super ability must be an ability the manual marks 'Super : Available'.
    super_ok = {key(a["name"]) for a in e["hero_abilities"]
                if (a["super"] or "").lower().startswith("available")}
    bad_super = sorted({a for h in e["hero_types"] for a in h["super_abilities"]
                        if key(a) not in super_ok})
    if bad_super:
        failures.append(
            f"'*' abilities whose ability has no 'Super : Available': {bad_super}")

    building_names = ({key(b["name"]) for b in e["buildings"]}
                      | {key(b["name"]) for b in e["production_options"]})

    # Building corrections must land on a real building, or the mapping is stale.
    unresolved = sorted({c["corrected_to"] for c in e["name_corrections"]
                         if c["kind"] == "building"
                         and key(c["corrected_to"]) not in building_names})
    if unresolved:
        failures.append(f"name corrections that match no building: {unresolved}")
    if not e["name_corrections"]:
        failures.append("no name corrections applied -- the manual's misspellings "
                        "are expected to still be there")

    # Unit stat parsing. An unrecognised stat token must never quietly become an
    # ability, and every described unit must carry the stats they all share.
    described = [u for u in e["common_units"] + e["racial_units"] if u["stats_text"]]
    check("units with a stat line", len(described),
          EXPECTED["common_unit_stat_lines"] + EXPECTED["racial_units"])
    unparsed = sorted({t for u in described for t in u["stats_unparsed"]})
    if unparsed:
        failures.append(f"unrecognised unit stat tokens: {unparsed}")
    for stat in UNIVERSAL_STATS:
        missing = [u["name"] for u in described if stat not in u["stats"]]
        if missing:
            failures.append(f"units with no '{stat}' stat: {missing}")
    # No shared head may remain undistributed. Checked by idempotency rather than by
    # hunting bare tokens, since a lone bare subject is legitimately an ability
    # (Phantom Warriors' 'Illusion') and must survive untouched.
    stale = [x["name"] for x in described + e["summoned_creatures"]
             if expand_shared_immunity(x["abilities"], "", []) != x["abilities"]]
    if stale:
        failures.append(f"unexpanded shared-head immunity lists: {stale}")
    # No spelling variant may survive, or a filter on the corrected name misses a unit.
    uncorrected = sorted({a for x in described + e["summoned_creatures"]
                          for a in x["abilities"]
                          if a.lower().strip() in ABILITY_CORRECTIONS})
    if uncorrected:
        failures.append(f"uncorrected ability spellings: {uncorrected}")

    # Summoned creatures: same stat discipline as buildable units, plus the
    # label-independent second count. If these two ever disagree, the shape rule has
    # drifted -- which is exactly how the 39-vs-48 undercount arose in the first place.
    summoned = e["summoned_creatures"]
    label_free = 0
    for s in e["spells"]:
        for raw in s["effect"]:
            m = re.match(r"^([^:]{0,45}):\s*(.*)$", raw)
            body = m.group(2) if m else raw
            if sum(1 for t in re.split(r"[,.]", body)
                   if STAT_TOKEN_RE.match(t.strip())) >= 6:
                label_free += 1
    check("summoned_creatures (label-free method)", label_free,
          EXPECTED["summoned_creatures"])
    bad = sorted({t for c in summoned for t in c["stats_unparsed"]})
    if bad:
        failures.append(f"unrecognised summoned-creature stat tokens: {bad}")
    for stat in UNIVERSAL_STATS:
        missing = [c["name"] for c in summoned if stat not in c["stats"]]
        if missing:
            failures.append(f"summoned creatures with no '{stat}' stat: {missing}")
    orphan = [c["name"] for c in summoned
              if c["summoned_by"] not in {s["name"] for s in e["spells"]}]
    if orphan:
        failures.append(f"summoned creatures with no summoning spell: {orphan}")

    unit_names = ({key(u["name"]) for u in e["common_units"]}
                  | {key(u["name"]) for u in e["racial_units"]})
    dangling_units = sorted({u for r in e["races"] for u in r["common_units"]
                             if key(u) not in unit_names})
    if dangling_units:
        failures.append(f"race common-unit references with no unit: {dangling_units}")

    for t in e["building_trees"]:
        bad = sorted({n for x in t["edges"] for n in x["requires"] + x["unlocks"]
                      if key(n) not in building_names})
        if bad:
            failures.append(f"dependency tree '{t['name']}' names unknown buildings: {bad}")

    if c["unclaimed"]:
        failures.append(
            f"unclaimed entity text: {len(c['unclaimed'])} paragraph(s); first at "
            f"{c['unclaimed'][0]['chapter']} line {c['unclaimed'][0]['line']}")
    # The table of contents is the only text expected before the first chapter.
    stray = [u for u in c["preamble_stray"] if u["line"] > 110]
    if stray:
        failures.append(f"stray text after the TOC: {len(stray)} paragraph(s); "
                        f"first at line {stray[0]['line']}")

    if failures:
        print("VERIFY FAILED", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        print("\nDo not relax these assertions. A mismatch means the parser or the "
              "expected count is wrong; both are defects to report.", file=sys.stderr)
        return 1

    print("VERIFY OK")
    for k in ("chapter_count", "race_sections", "spell_entries", "entries_total"):
        print(f"  {k}: {c[k]}")
    for k, v in sorted(ent.items()):
        print(f"  {k}: {v}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--census", action="store_true", help="print a structural summary")
    ap.add_argument("--verify", action="store_true", help="assert the contract; exit 1 on failure")
    ap.add_argument("--emit", action="store_true", help=f"write {OUT_JSON.name}")
    args = ap.parse_args()

    paras, _ = cut_changelog(load_paras())
    annotated = annotate(paras)

    if args.census:
        print(json.dumps(census(annotated), indent=2, ensure_ascii=False))
    if args.emit:
        OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
        OUT_JSON.write_text(
            json.dumps(build(annotated), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
        print(f"wrote {OUT_JSON.relative_to(REPO)}")
    if args.verify or not (args.census or args.emit):
        return verify(annotated)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
