"""Stage 2: Branded thumbnail generation using Pillow.

Creates 1200x630 PNG images matching the TendHunt dark brand theme.
Downloads TTF fonts from Google Fonts if not present.

Usage:
    python generate_thumbnails.py "Article Title" "Tag Name" output.png
"""

import io
import os
import sys
import textwrap
import zipfile
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont

from config import (
    ACCENT_COLOR,
    BG_COLOR,
    FONTS_DIR,
    GRID_COLOR,
    IMG_HEIGHT,
    IMG_WIDTH,
    SECONDARY_TEXT,
    TEXT_COLOR,
    THUMBNAILS_DIR,
)

# Font file paths
FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# Google Fonts download URLs
SPACE_GROTESK_URL = "https://fonts.google.com/download?family=Space+Grotesk"
INTER_URL = "https://fonts.google.com/download?family=Inter"


def setup_fonts() -> None:
    """Download TTF fonts from Google Fonts if not already present."""
    if FONT_BOLD.exists() and FONT_REGULAR.exists():
        return

    FONTS_DIR.mkdir(exist_ok=True)

    if not FONT_BOLD.exists():
        print("  Downloading Space Grotesk font...")
        try:
            response = urlopen(SPACE_GROTESK_URL)
            zip_data = io.BytesIO(response.read())
            with zipfile.ZipFile(zip_data) as zf:
                for name in zf.namelist():
                    if name.endswith("SpaceGrotesk-Bold.ttf"):
                        with zf.open(name) as src:
                            FONT_BOLD.write_bytes(src.read())
                        print(f"  Saved: {FONT_BOLD}")
                        break
                else:
                    # Try any Bold TTF file
                    for name in zf.namelist():
                        if "Bold" in name and name.endswith(".ttf"):
                            with zf.open(name) as src:
                                FONT_BOLD.write_bytes(src.read())
                            print(f"  Saved: {FONT_BOLD}")
                            break
        except Exception as e:
            print(f"  WARNING: Could not download Space Grotesk: {e}")

    if not FONT_REGULAR.exists():
        print("  Downloading Inter font...")
        try:
            response = urlopen(INTER_URL)
            zip_data = io.BytesIO(response.read())
            with zipfile.ZipFile(zip_data) as zf:
                for name in zf.namelist():
                    if name.endswith("Inter-Regular.ttf"):
                        with zf.open(name) as src:
                            FONT_REGULAR.write_bytes(src.read())
                        print(f"  Saved: {FONT_REGULAR}")
                        break
                else:
                    # Try any Regular TTF file
                    for name in zf.namelist():
                        if "Regular" in name and name.endswith(".ttf"):
                            with zf.open(name) as src:
                                FONT_REGULAR.write_bytes(src.read())
                            print(f"  Saved: {FONT_REGULAR}")
                            break
        except Exception as e:
            print(f"  WARNING: Could not download Inter: {e}")


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def generate_thumbnail(
    title: str,
    tag: str,
    output_path: str,
) -> None:
    """Generate a branded TendHunt blog thumbnail.

    Args:
        title: Article title to display.
        tag: Primary tag to show in the accent pill.
        output_path: Path to save the PNG image.
    """
    # Ensure fonts are available
    setup_fonts()

    # Create base image
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Draw subtle grid pattern
    for x in range(0, IMG_WIDTH, 40):
        draw.line([(x, 0), (x, IMG_HEIGHT)], fill=GRID_COLOR, width=1)
    for y in range(0, IMG_HEIGHT, 40):
        draw.line([(0, y), (IMG_WIDTH, y)], fill=GRID_COLOR, width=1)

    # Draw accent bar at top (6px)
    draw.rectangle([(0, 0), (IMG_WIDTH, 6)], fill=ACCENT_COLOR)

    # Load fonts
    title_font = _load_font(FONT_BOLD, 52)
    tag_font = _load_font(FONT_REGULAR, 20)
    brand_font = _load_font(FONT_BOLD, 24)
    brand_url_font = _load_font(FONT_REGULAR, 18)

    # Draw tag pill
    tag_text = tag.upper()
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    pill_x = 60
    pill_y = 80
    pill_padding_x = 16
    pill_padding_y = 8
    draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pill_padding_x * 2, pill_y + tag_h + pill_padding_y * 2),
        ],
        radius=6,
        fill=ACCENT_COLOR,
    )
    draw.text(
        (pill_x + pill_padding_x, pill_y + pill_padding_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # Draw title (wrapped to max 3 lines)
    wrapped = textwrap.fill(title, width=28)
    lines = wrapped.split("\n")[:3]  # Max 3 lines
    wrapped = "\n".join(lines)
    draw.multiline_text(
        (60, 140),
        wrapped,
        fill=TEXT_COLOR,
        font=title_font,
        spacing=12,
    )

    # Draw brand name bottom-left
    draw.text((60, IMG_HEIGHT - 70), "TendHunt", fill=ACCENT_COLOR, font=brand_font)

    # Draw brand URL next to brand name
    brand_bbox = draw.textbbox((60, IMG_HEIGHT - 70), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 16
    draw.text(
        (url_x, IMG_HEIGHT - 66),
        "tendhunt.com/blog",
        fill=SECONDARY_TEXT,
        font=brand_url_font,
    )

    # Draw accent dot bottom-right
    draw.ellipse(
        [(IMG_WIDTH - 100, IMG_HEIGHT - 100), (IMG_WIDTH - 60, IMG_HEIGHT - 60)],
        fill=ACCENT_COLOR,
    )

    # Save
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output), "PNG", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python generate_thumbnails.py <title> <tag> <output_path>")
        print('  Example: python generate_thumbnails.py "How to Find UK Tenders" "UK Procurement" thumbnails/test.png')
        sys.exit(1)

    title = sys.argv[1]
    tag = sys.argv[2]
    output = sys.argv[3]

    print(f"Generating thumbnail: {title}")
    generate_thumbnail(title, tag, output)
    print(f"Thumbnail saved to: {output}")
