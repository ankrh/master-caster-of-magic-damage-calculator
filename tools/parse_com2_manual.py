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
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser

REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = REPO / "Reference docs" / "CoM2manual.html"
OUT_JSON = REPO / "Manual" / "manual_com2.json"

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

# Expected entity counts. These are assertions, not thresholds -- see
# Manual/SPEC.md, "Extraction contract". If one fails, the parser or the count is
# wrong. Fix the defect; never relax the number.
EXPECTED = {
    "chapters": len(CHAPTER_TITLES),
    "races": 14,           # size-5 underlined-bold headings under Arcanus + Myrror
    # 234, not 233: Arcane 14 + five realms x (Common 10, Uncommon 10, Rare 12,
    # Very Rare 12) = 14 + 220. All five realms landing on an identical rarity
    # split is the corroboration -- an earlier grep-based count said 233 because
    # one heading splits across lines and adjacency matching missed it.
    "spell_entries": 234,
    # Entries detected by the *global* style rule (size 4, bold + underlined).
    # This covers spells and item powers only -- see PER-CHAPTER CONVENTIONS.
    "entries_total": 272,
}

# PER-CHAPTER CONVENTIONS -- the single most important thing to know about this
# source. There is NO global entry rule. Each chapter marks its entries
# differently, and two chapters cannot be detected by style at all:
#
#   Spells         size 4, bold + underline, realm-coloured, numbered      [done]
#   Item Powers    size 4, bold + underline, realm-coloured                [done]
#   Races          size 5, bold + underline                                [done]
#   Retorts        size 4, BOLD ONLY; body shares the heading paragraph
#                  in a font-weight:normal span
#   Buildings      size 4, BOLD ONLY, and stylistically identical to their
#                  own field lines -- must be detected by content: a heading
#                  is a bold size-4 paragraph that does NOT match
#                  ^(Cost|Effect|Required by|Special)\s*:
#   Hero Abilities size 4, UNDERLINE ONLY, with every field in one paragraph
#   Hero Types     separated by <br>. Note the FAQ chapter also uses
#                  underline-only size 4 for its questions, so this rule must
#                  be scoped to the Heroes chapter.
#   Common Units   no heading markup at all; plain body lines shaped
#                  "-Name (cost) : stats"
#
# As each chapter's extraction lands, add its count to EXPECTED and to verify().
# Item Powers currently detects 37; a hand count of the realm groupings suggests
# 38. Resolve that before asserting it.

# Realm colours used on spell headings.
REALM_BY_COLOR = {
    "#00ae00": "nature",
    "#ffffff": None,
}


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
    def text(self) -> str:
        return normalize_ws("".join(r.text for r in self.runs))

    def lead(self) -> Run | None:
        """First run with visible text -- the one that decides classification."""
        for r in self.runs:
            if r.text.strip():
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
                out.append(normalize_ws("".join(cur)))
                cur = []
        if cur:
            out.append(normalize_ws("".join(cur)))
        return [s for s in out if s]


def normalize_ws(s: str) -> str:
    return re.sub(r"[ \t\r\f\v]+", " ", s.replace("\xa0", " ")).strip()


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
            self._cur.runs.append(Run("\n", *self._style_tuple()))
        if tag not in ("br", "img", "meta", "hr"):
            self.stack.append((tag, a))

    def _style_tuple(self):
        s = self._style()
        return (s.size, s.bold, s.underline, s.strike, s.color)

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


def classify(p: Para) -> str:
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
    if lead.bold and lead.underline and lead.size == 4:
        return ENTRY
    return BODY


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
    return tk.paras


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


def build(paras: list[Para]) -> dict:
    """Structural tree: chapter -> group -> section -> entry -> body paragraphs.

    Field-level extraction per entity type is deliberately NOT done here yet;
    this establishes the skeleton and the assertion contract.
    """
    doc = {"version": "com2_1.5.11", "chapters": [], "preamble": []}
    chapter = group = section = entry = None

    for p in paras:
        kind = classify(p)
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
            tail = normalize_ws("".join(r.text for r in p.runs if not r.bold))
            if tail:
                entry["title"] = normalize_ws(
                    "".join(r.text for r in p.runs if r.bold))
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


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

def census(paras: list[Para]) -> dict:
    counts = Counter(classify(p) for p in paras)
    sizes = Counter()
    for p in paras:
        lead = p.lead()
        if lead and lead.bold:
            sizes[(lead.size, "u+b" if lead.underline else "b")] += 1

    doc = build(paras)
    chapters = [c["title"] for c in doc["chapters"]]

    spells_ch = find_chapter(doc, "Spells")
    races_ch = find_chapter(doc, "Races")
    races = 0
    if races_ch:
        for plane in races_ch["children"]:
            if plane["title"].strip().lower() in ("arcanus", "myrror"):
                races += len(plane["children"])

    per_chapter = {c["title"]: count_entries(c) for c in doc["chapters"]}
    groups = {}
    for c in doc["chapters"]:
        for g in c["children"]:
            if g["children"] or g["entries"]:
                groups[f"{c['title']} / {g['title']}"] = count_entries(g)

    return {
        "paragraphs": len(paras),
        "by_kind": dict(counts),
        "bold_leads_by_size": {f"{k[0]}{k[1]}": v for k, v in sorted(sizes.items())},
        "chapters": chapters,
        "chapter_count": len(chapters),
        "entries_total": sum(count_entries(c) for c in doc["chapters"]),
        "entries_per_chapter": per_chapter,
        "entries_per_group": groups,
        "spell_entries": count_entries(spells_ch) if spells_ch else 0,
        "race_sections": races,
        "preamble_paragraphs": len(doc["preamble"]),
        "unclaimed": unclaimed(paras),
    }


def unclaimed(paras: list[Para]) -> list[dict]:
    """Body text appearing before any chapter opens -- i.e. text the tree drops.

    Manual/SPEC.md requires this to be empty: a silent drop is a defect.
    The title block and table of contents are expected and excluded.
    """
    out, seen_chapter = [], False
    for p in paras:
        kind = classify(p)
        if kind == CHAPTER:
            seen_chapter = True
            continue
        if not seen_chapter and p.text:
            out.append({"line": p.line, "text": p.text[:120]})
    return out


def die(msg: str):
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(2)


def verify(paras: list[Para]) -> int:
    c = census(paras)
    failures = []

    def check(name, got, want):
        if got != want:
            failures.append(f"{name}: expected {want}, got {got}")

    check("chapters", c["chapter_count"], EXPECTED["chapters"])
    check("races", c["race_sections"], EXPECTED["races"])
    check("spell_entries", c["spell_entries"], EXPECTED["spell_entries"])
    check("entries_total", c["entries_total"], EXPECTED["entries_total"])

    # The table of contents is the only text expected before the first chapter.
    stray = [u for u in c["unclaimed"] if u["line"] > 110]
    if stray:
        failures.append(f"unclaimed text after the TOC: {len(stray)} paragraph(s); "
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
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--census", action="store_true", help="print a structural summary")
    ap.add_argument("--verify", action="store_true", help="assert the contract; exit 1 on failure")
    ap.add_argument("--emit", action="store_true", help=f"write {OUT_JSON.name}")
    args = ap.parse_args()

    paras, _ = cut_changelog(load_paras())

    if args.census:
        print(json.dumps(census(paras), indent=2, ensure_ascii=False))
    if args.emit:
        OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
        OUT_JSON.write_text(
            json.dumps(build(paras), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8")
        print(f"wrote {OUT_JSON.relative_to(REPO)}")
    if args.verify or not (args.census or args.emit):
        return verify(paras)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
