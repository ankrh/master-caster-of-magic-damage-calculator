"""
Convert Fandom wiki .htm files to clean markdown.

Extracts the article body from the 'mw-parser-output' div,
strips navigation/UI chrome, and converts to readable markdown.

Usage:
    python htm_to_md.py                           # convert all .htm/.html in the default saved-pages dir, skipping already-converted files
    python htm_to_md.py <input.htm>               # prints to stdout
    python htm_to_md.py <input.htm> -o out.md     # writes to file
    python htm_to_md.py --all <directory>         # converts all top-level .htm/.html in dir (skips already-converted)
    python htm_to_md.py --force                   # re-convert even if .md already exists
"""

DEFAULT_DIR = r"C:\CoM2-damage-calculator\Reference docs\MoM source - Fandom site\saved pages"

import sys
import os
import re
from bs4 import BeautifulSoup, NavigableString
from markdownify import markdownify


def convert_htm_to_md(input_path):
    """Convert a single Fandom .htm file to clean markdown."""
    with open(input_path, "r", encoding="utf-8", errors="replace") as f:
        html = f.read()

    soup = BeautifulSoup(html, "html.parser")

    # Extract the article content div
    content_div = soup.find("div", class_="mw-parser-output")
    if not content_div:
        print(f"Warning: No mw-parser-output found in {input_path}", file=sys.stderr)
        return ""

    # Remove elements we don't want
    selectors_to_remove = [
        ".toc",                # table of contents
        ".mw-editsection",     # [edit] links
        ".navbox",             # navigation boxes
        ".noprint",
        ".mw-empty-elt",
        "script",
        "style",
        "noscript",
        ".infobox",
    ]
    for selector in selectors_to_remove:
        for el in content_div.select(selector):
            el.decompose()

    # Replace images with text fallback (title or alt) before removing them,
    # so image-only table cells and links don't lose their content.
    for img in content_div.find_all("img"):
        # Use the parent <a> title if available, otherwise the img alt text
        parent_a = img.find_parent("a")
        text = ""
        if parent_a and parent_a.get("title"):
            text = parent_a["title"]
        elif img.get("alt"):
            text = img["alt"]
        img.replace_with(text)

    # Convert to markdown
    md = markdownify(str(content_div), heading_style="ATX", strip=["svg"])

    # Clean up artifacts
    md = re.sub(r"\[]\s*", "", md)           # empty [] from stripped images/links
    md = re.sub(r"\ufffd", "", md)            # replacement characters
    md = re.sub(r"\n{3,}", "\n\n", md)        # excessive blank lines
    md = re.sub(r"[ \t]+\n", "\n", md)        # trailing whitespace
    md = re.sub(r"\n[ \t]+\n", "\n\n", md)    # whitespace-only lines

    return md.strip()


def convert_directory(directory, force=False, output_dir=None):
    """Convert all top-level .htm/.html files in directory, skipping already-converted files unless force=True.

    Output .md files are written to output_dir (defaults to the parent of directory).
    """
    if output_dir is None:
        output_dir = os.path.dirname(os.path.abspath(directory))
    os.makedirs(output_dir, exist_ok=True)
    converted = 0
    skipped = 0
    for fname in sorted(os.listdir(directory)):
        if fname.startswith("."):
            continue
        lower = fname.lower()
        if not (lower.endswith(".htm") or lower.endswith(".html")):
            continue
        input_path = os.path.join(directory, fname)
        base_name = fname.replace(" _ Master of Magic Wiki _ Fandom", "")
        output_name = base_name.rsplit(".", 1)[0] + ".md"
        output_path = os.path.join(output_dir, output_name)
        if not force and os.path.exists(output_path):
            print(f"  skip (md exists): {fname}")
            skipped += 1
            continue
        md = convert_htm_to_md(input_path)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"  {fname} -> {output_name}")
        converted += 1
    print(f"Done. Converted {converted}, skipped {skipped}.")


def main():
    # No args, or --force: convert the default directory
    if len(sys.argv) < 2 or sys.argv[1] == "--force":
        force = len(sys.argv) >= 2 and sys.argv[1] == "--force"
        convert_directory(DEFAULT_DIR, force=force)
        return

    if sys.argv[1] == "--all":
        if len(sys.argv) < 3:
            print("Usage: htm_to_md.py --all <directory> [--force]")
            sys.exit(1)
        directory = sys.argv[2]
        force = "--force" in sys.argv[3:]
        convert_directory(directory, force=force)
    else:
        input_path = sys.argv[1]
        md = convert_htm_to_md(input_path)

        if len(sys.argv) >= 4 and sys.argv[2] == "-o":
            with open(sys.argv[3], "w", encoding="utf-8") as f:
                f.write(md)
            print(f"Written to {sys.argv[3]}")
        else:
            print(md)


if __name__ == "__main__":
    main()
