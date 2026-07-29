"""
Generate the site favicon from the Master of Magic melee-attack sprite.

The source is an 18x16 webp that is really a 9x8 logical sprite at 2x. Favicons
are rendered square, so the 9x8 grid is stretched to fill a square. Stretching
hard rectangle edges (SVG) or whole integer pixel blocks (PNG) keeps the pixel
art crisp; resampling a bitmap into a square would not.

Run from any working directory:
  python tools/generate_favicon.py
"""

from pathlib import Path

from PIL import Image

SOURCE = "Icon_Melee_Normal.webp"


def hexof(rgba):
    return "#%02x%02x%02x" % rgba[:3]


def main():
    repo_root = Path(__file__).resolve().parent.parent
    im = Image.open(repo_root / SOURCE).convert("RGBA")
    if im.size != (18, 16):
        raise SystemExit(f"unexpected source size {im.size}, expected (18, 16)")

    logical = im.resize((im.width // 2, im.height // 2), Image.NEAREST)
    width, height = logical.size
    px = logical.load()

    # The 2x downscale must be lossless, i.e. every 2x2 block was one colour.
    if list(logical.resize(im.size, Image.NEAREST).get_flattened_data()) != \
            list(im.get_flattened_data()):
        raise SystemExit("source is not an exact 2x sprite; downscaling would lose detail")

    rects = "\n  ".join(
        f'<rect x="{x}" y="{y}" width="1" height="1" fill="{hexof(px[x, y])}"/>'
        for y in range(height)
        for x in range(width)
    )
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" '
        f'viewBox="0 0 {width} {height}" preserveAspectRatio="none" '
        'shape-rendering="crispEdges">\n'
        f"  {rects}\n</svg>\n"
    )
    (repo_root / "favicon.svg").write_text(svg, encoding="utf-8")

    # PNG fallback at 144x144, so each logical pixel is an exact 16x18 block.
    cell_w, cell_h = 16, 18
    png = Image.new("RGBA", (width * cell_w, height * cell_h))
    for y in range(height):
        for x in range(width):
            png.paste(px[x, y], (x * cell_w, y * cell_h,
                                 (x + 1) * cell_w, (y + 1) * cell_h))
    png.save(repo_root / "favicon.png", optimize=True)

    print(f"favicon.svg  {len(svg)} bytes ({width}x{height} grid)")
    print(f"favicon.png  {png.width}x{png.height}")


if __name__ == "__main__":
    main()
