"""Style 05: Bold Diagonal Split thumbnail generator.

Creates a 1200x630 thumbnail with a dramatic diagonal split composition:
- Bottom-left triangle: dark (#0A0A0A) with bold white title text
- Top-right triangle: lime (#E5FF00) with large decorative number
- Tag pill at the diagonal intersection point
- Noise texture overlay on both sections for premium feel
- TendHunt branding anchored at bottom-left

Usage:
    python style_05_split_diagonal.py
    python style_05_split_diagonal.py "Custom Title" "Custom Tag" output.png
"""

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------------------------------------------------------------------------
# Brand constants (mirroring config.py to keep this module self-contained)
# ---------------------------------------------------------------------------
BG_COLOR = (10, 10, 10)            # #0A0A0A
ACCENT_COLOR = (229, 255, 0)       # #E5FF00
TEXT_COLOR = (255, 255, 255)        # White
SECONDARY_TEXT = (161, 161, 161)    # #A1A1A1

IMG_WIDTH = 1200
IMG_HEIGHT = 630

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR.parent / "thumbnails"

FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to Pillow default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _generate_noise_layer(
    width: int,
    height: int,
    intensity: int = 18,
    seed: int = 42,
) -> Image.Image:
    """Create a monochrome noise texture as an RGBA overlay.

    The noise is subtle -- just enough grain to give a printed / premium feel
    without competing with text legibility.
    """
    rng = random.Random(seed)
    noise = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = noise.load()
    for y in range(height):
        for x in range(width):
            v = rng.randint(-intensity, intensity)
            if v > 0:
                pixels[x, y] = (255, 255, 255, abs(v))
            else:
                pixels[x, y] = (0, 0, 0, abs(v))
    return noise


def _draw_diagonal_mask(width: int, height: int) -> Image.Image:
    """Return an L-mode mask where white = lime region, black = dark region.

    The diagonal runs from ~55% across at the bottom to the top-right corner.
    This gives the dark section generous horizontal space for the title while
    the lime triangle fills the upper-right with a strong, dramatic slash.
    """
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # The diagonal polygon fills the top-right triangle.
    # The slash runs from ~55% across at the bottom to 100% width near the top,
    # giving the dark section the majority of horizontal space for title text.
    diagonal_polygon = [
        (int(width * 0.55), height),   # bottom anchor — just past center
        (width, int(height * 0.05)),   # top anchor — almost at top-right
        (width, 0),                     # top-right corner
        (width, height),                # bottom-right corner
    ]
    draw.polygon(diagonal_polygon, fill=255)
    return mask


def _wrap_title(title: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Word-wrap title text so each line fits within max_width pixels."""
    words = title.split()
    lines: list[str] = []
    current_line = ""

    for word in words:
        test = f"{current_line} {word}".strip()
        bbox = font.getbbox(test)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    return lines[:4]  # cap at 4 lines


def _draw_decorative_number(
    draw: ImageDraw.ImageDraw,
    region_bbox: tuple[int, int, int, int],
    font_path: Path,
) -> None:
    """Draw a large semi-transparent number in the lime triangle for visual hook.

    The number '05' is rendered oversized and clipped visually to the lime area
    via dark-tinted fill, creating a watermark-like effect that adds depth.
    """
    x1, y1, x2, y2 = region_bbox
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2

    number_font = _load_font(font_path, 280)

    # Slight offset toward upper-right to sit inside the lime triangle
    text = "05"
    bbox = number_font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    tx = cx - tw // 2 + 100
    ty = cy - th // 2 - 60

    # Draw with a dark tint that blends with the lime (creating an olive tone)
    draw.text(
        (tx, ty),
        text,
        fill=(180, 200, 0, 60),  # muted lime, low alpha handled via composite
        font=number_font,
    )


def _draw_search_icon(
    draw: ImageDraw.ImageDraw,
    cx: int,
    cy: int,
    size: int = 100,
    color: tuple = (10, 10, 10),
    width: int = 6,
) -> None:
    """Draw a magnifying glass silhouette icon for the lime section.

    This is a more thematic visual hook -- a search/discovery icon that ties
    into the 'Find Tenders' theme.
    """
    radius = size // 2
    # Circle
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        outline=color,
        width=width,
    )
    # Handle (angled down-right from circle edge)
    handle_len = int(size * 0.55)
    angle = math.radians(45)
    start_x = cx + int(radius * math.cos(angle))
    start_y = cy + int(radius * math.sin(angle))
    end_x = start_x + int(handle_len * math.cos(angle))
    end_y = start_y + int(handle_len * math.sin(angle))
    draw.line(
        [(start_x, start_y), (end_x, end_y)],
        fill=color,
        width=width + 2,
    )


def _draw_crosshair_marks(
    draw: ImageDraw.ImageDraw,
    width: int,
    height: int,
) -> None:
    """Draw subtle corner crop marks for a print-design feel."""
    mark_len = 20
    mark_color = (40, 40, 40)
    mark_w = 1
    offset = 24

    corners = [
        (offset, offset),
        (width - offset, offset),
        (offset, height - offset),
        (width - offset, height - offset),
    ]
    for cx, cy in corners:
        draw.line([(cx - mark_len, cy), (cx + mark_len, cy)], fill=mark_color, width=mark_w)
        draw.line([(cx, cy - mark_len), (cx, cy + mark_len)], fill=mark_color, width=mark_w)


def generate_style_05(
    title: str,
    tag: str,
    output_path: str | Path,
    *,
    show_number: bool = True,
) -> Path:
    """Generate a Bold Diagonal Split thumbnail.

    Args:
        title: Article headline.
        tag: Primary category tag.
        output_path: File path for the output PNG.
        show_number: If True, draw a large '05' watermark in the lime section.

    Returns:
        Path to the saved image.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # 1. Base layers: dark background + lime overlay via diagonal mask
    # ------------------------------------------------------------------
    dark_layer = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    lime_layer = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), ACCENT_COLOR)
    mask = _draw_diagonal_mask(IMG_WIDTH, IMG_HEIGHT)

    # Anti-alias the mask edge by applying a tiny blur
    mask_smooth = mask.filter(ImageFilter.GaussianBlur(radius=1.5))

    img = Image.composite(lime_layer, dark_layer, mask_smooth)

    # ------------------------------------------------------------------
    # 2a. Glow effect along the diagonal edge for dramatic tension
    # ------------------------------------------------------------------
    glow_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    # Draw a thick lime line along the diagonal that we then blur
    glow_draw.line(
        [
            (int(IMG_WIDTH * 0.55), IMG_HEIGHT),
            (IMG_WIDTH, int(IMG_HEIGHT * 0.05)),
        ],
        fill=(229, 255, 0, 80),
        width=20,
    )
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=18))
    img = Image.alpha_composite(img.convert("RGBA"), glow_layer).convert("RGB")

    # ------------------------------------------------------------------
    # 2b. Subtle detail lines along the diagonal edge
    # ------------------------------------------------------------------
    draw = ImageDraw.Draw(img)

    # Thin dark line tracing inside the lime edge for definition
    offset_px = 4
    draw.line(
        [
            (int(IMG_WIDTH * 0.55) + offset_px, IMG_HEIGHT),
            (IMG_WIDTH, int(IMG_HEIGHT * 0.05) + offset_px),
        ],
        fill=(180, 200, 0),
        width=2,
    )

    # Faint parallel line in the dark zone for layered depth
    draw.line(
        [
            (int(IMG_WIDTH * 0.55) - 30, IMG_HEIGHT),
            (IMG_WIDTH, int(IMG_HEIGHT * 0.05) - 30),
        ],
        fill=(25, 25, 25),
        width=1,
    )

    # ------------------------------------------------------------------
    # 3. Corner crop marks (print-design aesthetic)
    # ------------------------------------------------------------------
    _draw_crosshair_marks(draw, IMG_WIDTH, IMG_HEIGHT)

    # ------------------------------------------------------------------
    # 4. Decorative element in the lime triangle
    # ------------------------------------------------------------------
    if show_number:
        # Large watermark number
        number_font = _load_font(FONT_BOLD, 320)
        text_05 = "05"
        bbox_05 = number_font.getbbox(text_05)
        tw = bbox_05[2] - bbox_05[0]
        th = bbox_05[3] - bbox_05[1]

        # Create a temporary RGBA layer for the translucent number
        number_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
        number_draw = ImageDraw.Draw(number_layer)
        # Position in the upper-right quadrant inside the lime triangle
        nx = IMG_WIDTH - tw - 40
        ny = 20
        number_draw.text(
            (nx, ny),
            text_05,
            fill=(200, 220, 0, 70),  # subtle olive-lime watermark
            font=number_font,
        )
        # Composite onto main image
        img = Image.alpha_composite(img.convert("RGBA"), number_layer).convert("RGB")
        draw = ImageDraw.Draw(img)

    # Draw search/magnifying-glass icon inside the lime triangle
    # Position it in the center-mass of the lime region
    _draw_search_icon(
        draw,
        cx=IMG_WIDTH - 160,
        cy=IMG_HEIGHT // 2 + 60,
        size=110,
        color=(10, 10, 10),
        width=6,
    )

    # ------------------------------------------------------------------
    # 5. Tag pill -- above the title for clear visual hierarchy
    # ------------------------------------------------------------------
    tag_font = _load_font(FONT_BOLD, 15)
    tag_text = tag.upper()
    tag_bbox_ref = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox_ref[2] - tag_bbox_ref[0]
    tag_h = tag_bbox_ref[3] - tag_bbox_ref[1]
    pad_x, pad_y = 16, 8

    # ------------------------------------------------------------------
    # 6. Title text -- large, bold, white on the dark section
    # ------------------------------------------------------------------
    title_font = _load_font(FONT_BOLD, 62)
    # The dark triangle now extends to ~55% of width at the bottom.
    # At the vertical center the diagonal is around 77% of width.
    # Keep a safe margin so text never overlaps the lime zone.
    # Max text width: ~52% of canvas minus left padding for generous wrapping.
    max_text_w = int(IMG_WIDTH * 0.52) - 60
    lines = _wrap_title(title, title_font, max_text_w)

    line_height = 76  # visual line spacing for 62px font
    total_text_h = len(lines) * line_height
    # Total vertical block = tag pill + gap + title text
    tag_pill_h = tag_h + pad_y * 2
    gap_after_tag = 18
    full_block_h = tag_pill_h + gap_after_tag + total_text_h
    # Center the full block vertically, biased slightly upward for branding room
    block_start_y = max(40, (IMG_HEIGHT - full_block_h) // 2 - 20)

    # Draw tag pill
    pill_x = 60
    pill_y = block_start_y
    pill_rect = [
        (pill_x, pill_y),
        (pill_x + tag_w + pad_x * 2, pill_y + tag_pill_h),
    ]
    draw.rounded_rectangle(pill_rect, radius=6, fill=ACCENT_COLOR)
    draw.text(
        (pill_x + pad_x, pill_y + pad_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # Draw title lines below the tag pill
    start_y = pill_y + tag_pill_h + gap_after_tag

    for i, line in enumerate(lines):
        y = start_y + i * line_height
        # Draw text shadow for depth and separation
        draw.text((63, y + 3), line, fill=(0, 0, 0), font=title_font)
        # Draw main text in bright white
        draw.text((60, y), line, fill=TEXT_COLOR, font=title_font)

    # Highlight the last line with a lime accent underline for emphasis
    if lines:
        last_line = lines[-1]
        last_y = start_y + (len(lines) - 1) * line_height
        last_bbox = title_font.getbbox(last_line)
        underline_y = last_y + last_bbox[3] - last_bbox[1] + 6
        underline_w = last_bbox[2] - last_bbox[0]
        draw.rectangle(
            [(60, underline_y), (60 + underline_w, underline_y + 4)],
            fill=ACCENT_COLOR,
        )

    # ------------------------------------------------------------------
    # 7. TendHunt branding at bottom-left in the dark section
    # ------------------------------------------------------------------
    brand_font = _load_font(FONT_BOLD, 22)
    url_font = _load_font(FONT_REGULAR, 15)

    brand_y = IMG_HEIGHT - 56

    # Brand name in lime
    draw.text((60, brand_y), "TendHunt", fill=ACCENT_COLOR, font=brand_font)

    # Separator dot
    brand_bbox = draw.textbbox((60, brand_y), "TendHunt", font=brand_font)
    dot_x = brand_bbox[2] + 12
    dot_cy = brand_y + (brand_bbox[3] - brand_bbox[1]) // 2
    draw.ellipse(
        [dot_x, dot_cy - 2, dot_x + 4, dot_cy + 2],
        fill=SECONDARY_TEXT,
    )

    # URL in muted gray
    draw.text(
        (dot_x + 14, brand_y + 4),
        "tendhunt.com/blog",
        fill=SECONDARY_TEXT,
        font=url_font,
    )

    # ------------------------------------------------------------------
    # 8. Thin accent line along the very bottom for grounding
    # ------------------------------------------------------------------
    draw.rectangle([(0, IMG_HEIGHT - 4), (IMG_WIDTH, IMG_HEIGHT)], fill=ACCENT_COLOR)

    # ------------------------------------------------------------------
    # 9. Noise texture overlay for premium tactile feel
    # ------------------------------------------------------------------
    noise = _generate_noise_layer(IMG_WIDTH, IMG_HEIGHT, intensity=14, seed=2026)
    img = Image.alpha_composite(img.convert("RGBA"), noise).convert("RGB")

    # ------------------------------------------------------------------
    # 10. Save
    # ------------------------------------------------------------------
    img.save(str(output_path), "PNG", optimize=True)
    print(f"  [style_05] Saved thumbnail: {output_path}")
    return output_path


# -----------------------------------------------------------------------
# CLI / direct execution
# -----------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) >= 4:
        _title = sys.argv[1]
        _tag = sys.argv[2]
        _output = sys.argv[3]
    else:
        _title = "How to Find UK Government Tenders in 2026"
        _tag = "UK Procurement"
        _output = str(THUMBNAILS_DIR / "test_style_05.png")

    print(f"Generating Style 05 (Bold Diagonal Split) thumbnail...")
    print(f"  Title: {_title}")
    print(f"  Tag:   {_tag}")
    result = generate_style_05(_title, _tag, _output)
    print(f"  Done: {result}")
