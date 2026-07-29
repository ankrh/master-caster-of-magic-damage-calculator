"""Generate searchable, formatting-aware HTML from the current Warlord PDF manual.

The PDF stores strikethrough as thin vector rectangles crossing otherwise ordinary
text. Plain PDF text extraction silently loses that distinction. This converter uses
PyMuPDF character geometry to identify those strike lines and emits semantic <del>
markup while retaining font weight, italics, colour, page boundaries, and approximate
page layout.

Run from the repository root:

    python tools/extract_warlord_manual_html.py
"""

from __future__ import annotations

import argparse
import hashlib
import html
from pathlib import Path
from typing import Any, Iterable

import fitz


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = REPO_ROOT / "Reference docs" / "Warlord_Manual v1.5.12.6.pdf"
DEFAULT_OUTPUT = REPO_ROOT / "Reference docs" / "Warlord manual v1.5.12.6.html"


def horizontal_strike_bands(page: fitz.Page) -> list[fitz.Rect]:
    """Return thin horizontal drawing bands that could be text strike lines."""

    bands: list[fitz.Rect] = []
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            kind = item[0]
            if kind == "re":
                rect = fitz.Rect(item[1])
                # Very short rectangles are bullet glyph strokes; very long ones are
                # table rules. Neither is a semantic text strike.
                if 8 <= rect.width <= 250 and rect.height <= 1.5:
                    bands.append(rect)
            elif kind == "l":
                start, end = item[1], item[2]
                width = abs(start.x - end.x)
                if abs(start.y - end.y) <= 1 and 8 <= width <= 250:
                    half_width = max(0.25, float(drawing.get("width") or 0.5) / 2)
                    bands.append(
                        fitz.Rect(
                            min(start.x, end.x),
                            start.y - half_width,
                            max(start.x, end.x),
                            start.y + half_width,
                        )
                    )
    return bands


def char_is_struck(char_rect: fitz.Rect, bands: Iterable[fitz.Rect]) -> bool:
    """Detect a strike band crossing the middle portion of a character."""

    if char_rect.width <= 0 or char_rect.height <= 0:
        return False
    middle_top = char_rect.y0 + char_rect.height * 0.30
    middle_bottom = char_rect.y0 + char_rect.height * 0.75
    required_overlap = min(char_rect.width, max(0.4, char_rect.width * 0.30))
    for band in bands:
        if band.y1 < middle_top or band.y0 > middle_bottom:
            continue
        overlap = min(char_rect.x1, band.x1) - max(char_rect.x0, band.x0)
        if overlap >= required_overlap:
            return True
    return False


def font_family(pdf_font: str) -> str:
    lowered = pdf_font.lower()
    if "times" in lowered:
        return '"Times New Roman", Times, serif'
    if "tahoma" in lowered:
        return "Tahoma, Arial, sans-serif"
    if "gothic" in lowered:
        return '"MS Gothic", monospace'
    if "symbol" in lowered:
        return "Symbol, serif"
    if "courier" in lowered or "mono" in lowered:
        return '"Courier New", monospace'
    return "Arial, Helvetica, sans-serif"


def colour_hex(colour: int) -> str:
    return f"#{colour & 0xFFFFFF:06x}"


def split_span_by_strike(
    span: dict[str, Any], bands: list[fitz.Rect]
) -> list[tuple[list[dict[str, Any]], bool]]:
    """Split one PDF span whenever its strikeout state changes."""

    chars = span.get("chars", [])
    states = [
        False if char["c"].isspace() else char_is_struck(fitz.Rect(char["bbox"]), bands)
        for char in chars
    ]

    # PDF strike rectangles can start or end a fraction inside the first/last glyph.
    # If at least half a word is crossed, expand to the word boundary. This keeps
    # "Altar" from becoming the nonsensical "A<del>ltar</del>" while still rejecting
    # incidental contact between a table rule and one character.
    word_start = 0
    while word_start < len(chars):
        while word_start < len(chars) and chars[word_start]["c"].isspace():
            word_start += 1
        word_end = word_start
        while word_end < len(chars) and not chars[word_end]["c"].isspace():
            word_end += 1
        if word_end > word_start:
            struck_count = sum(states[word_start:word_end])
            if struck_count * 2 >= word_end - word_start:
                states[word_start:word_end] = [True] * (word_end - word_start)
            elif struck_count:
                states[word_start:word_end] = [False] * (word_end - word_start)
        word_start = word_end

    # Join adjacent struck words through their intervening whitespace so the HTML
    # contains searchable phrases such as <del>Flame Blade</del>, not one tag per word.
    gap_start = 0
    while gap_start < len(chars):
        while gap_start < len(chars) and not chars[gap_start]["c"].isspace():
            gap_start += 1
        gap_end = gap_start
        while gap_end < len(chars) and chars[gap_end]["c"].isspace():
            gap_end += 1
        if gap_start > 0 and gap_end < len(chars) and states[gap_start - 1] and states[gap_end]:
            states[gap_start:gap_end] = [True] * (gap_end - gap_start)
        gap_start = gap_end

    groups: list[tuple[list[dict[str, Any]], bool]] = []
    for char, struck in zip(chars, states):
        if groups and groups[-1][1] == struck:
            groups[-1][0].append(char)
        else:
            groups.append(([char], struck))
    return groups


def render_text_run(
    chars: list[dict[str, Any]],
    span: dict[str, Any],
    struck: bool,
    direction: tuple[float, float],
) -> str:
    text = "".join(char["c"] for char in chars)
    if not text:
        return ""

    boxes = [fitz.Rect(char["bbox"]) for char in chars]
    rect = boxes[0]
    for box in boxes[1:]:
        rect |= box

    flags = int(span.get("flags", 0))
    styles = [
        f"left:{rect.x0:.2f}pt",
        f"top:{rect.y0:.2f}pt",
        f"font-size:{float(span.get('size', 10)):.2f}pt",
        f"font-family:{font_family(str(span.get('font', '')))}",
        f"color:{colour_hex(int(span.get('color', 0)))}",
    ]
    classes = ["text-run"]
    if flags & fitz.TEXT_FONT_BOLD:
        styles.append("font-weight:700")
    if flags & fitz.TEXT_FONT_ITALIC:
        styles.append("font-style:italic")
    if flags & fitz.TEXT_FONT_SUPERSCRIPT:
        classes.append("superscript")
    if abs(direction[1]) > 0.5:
        classes.append("vertical")

    escaped = html.escape(text, quote=False)
    content = f"<del>{escaped}</del>" if struck else escaped
    return (
        f'<span class="{" ".join(classes)}" style="{";".join(styles)}">'
        f"{content}</span>"
    )


def render_page(page: fitz.Page, page_number: int) -> tuple[str, int, int]:
    raw = page.get_text("rawdict", sort=True)
    bands = horizontal_strike_bands(page)
    runs: list[str] = []
    char_count = 0
    struck_char_count = 0

    for block in raw["blocks"]:
        if block["type"] != 0:
            continue
        for line in block.get("lines", []):
            direction = tuple(line.get("dir", (1.0, 0.0)))
            for span in line.get("spans", []):
                for chars, struck in split_span_by_strike(span, bands):
                    char_count += len(chars)
                    if struck:
                        struck_char_count += len(chars)
                    rendered = render_text_run(chars, span, struck, direction)
                    if rendered:
                        runs.append(rendered)

    page_html = (
        f'<section class="pdf-page" id="page-{page_number}" '
        f'aria-label="PDF page {page_number}" '
        f'style="width:{page.rect.width:.2f}pt;height:{page.rect.height:.2f}pt">\n'
        f'<a class="page-label" href="#page-{page_number}">PDF page {page_number}</a>\n'
        + "\n".join(runs)
        + "\n</section>"
    )
    return page_html, char_count, struck_char_count


def build_html(source: Path) -> tuple[str, dict[str, int | str]]:
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    document = fitz.open(source)
    pages: list[str] = []
    total_chars = 0
    struck_chars = 0
    for page_number, page in enumerate(document, start=1):
        page_html, page_chars, page_struck = render_page(page, page_number)
        pages.append(page_html)
        total_chars += page_chars
        struck_chars += page_struck

    title = "Caster of Magic Warlord Mod Manual — v1.5.12.6"
    body = "\n".join(pages)
    output = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="tools/extract_warlord_manual_html.py">
<meta name="source-sha256" content="{source_hash}">
<title>{html.escape(title)}</title>
<style>
  :root {{
    color-scheme: light;
    font-family: Arial, Helvetica, sans-serif;
  }}
  body {{
    margin: 0;
    padding: 24px;
    background: #e7e7e7;
    color: #111;
  }}
  .document-note {{
    box-sizing: border-box;
    max-width: 612pt;
    margin: 0 auto 20px;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid #bbb;
    line-height: 1.45;
  }}
  .document-note p {{
    margin: 0.35em 0;
  }}
  .pdf-page {{
    position: relative;
    box-sizing: content-box;
    margin: 0 auto 24px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 2px 10px rgb(0 0 0 / 20%);
  }}
  .page-label {{
    position: absolute;
    z-index: 2;
    top: 4pt;
    right: 6pt;
    padding: 2pt 4pt;
    color: #666;
    background: rgb(255 255 255 / 85%);
    font-size: 7pt;
    text-decoration: none;
  }}
  .text-run {{
    position: absolute;
    line-height: 1;
    white-space: pre;
    transform-origin: left top;
  }}
  .text-run.vertical {{
    transform: rotate(-90deg);
  }}
  .text-run.superscript {{
    line-height: 0.8;
  }}
  del {{
    text-decoration-line: line-through;
    text-decoration-thickness: 0.07em;
  }}
  @media (max-width: 700px) {{
    body {{
      padding: 8px;
    }}
    .pdf-page, .document-note {{
      transform-origin: top left;
    }}
  }}
</style>
</head>
<body>
<header class="document-note">
  <p><strong>{html.escape(title)}</strong></p>
  <p>Searchable HTML derived from
    <a href="Warlord_Manual%20v1.5.12.6.pdf">Warlord_Manual v1.5.12.6.pdf</a>.
    The PDF remains authoritative for visual verification.</p>
  <p>Page anchors correspond to PDF page numbers. Bold, italic, colour, and detected
    strikethrough formatting are preserved.</p>
  <p><small>Source SHA-256: <code>{source_hash}</code></small></p>
</header>
<main>
{body}
</main>
</body>
</html>
"""
    stats: dict[str, int | str] = {
        "pages": len(document),
        "characters": total_chars,
        "struck_characters": struck_chars,
        "source_sha256": source_hash,
    }
    document.close()
    return output, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    rendered, stats = build_html(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered, encoding="utf-8", newline="\n")
    print(
        f"Generated {output} from {source}: "
        f"{stats['pages']} pages, {stats['characters']} characters, "
        f"{stats['struck_characters']} struck characters"
    )


if __name__ == "__main__":
    main()
