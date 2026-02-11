"""Style 01: Geometric Abstract thumbnail generator.

Creates 1200x630 blog thumbnails with large overlapping geometric shapes
(circles, triangles, hexagons) in semi-transparent lime on a dark background.
Shapes are positioned asymmetrically to create visual depth and movement.

Usage:
    python style_01_geometric.py
    python style_01_geometric.py "Custom Title" "Custom Tag" output.png
"""

import math
import sys
import textwrap
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)               # #0A0A0A
ACCENT_COLOR = (229, 255, 0)          # #E5FF00
TEXT_COLOR = (255, 255, 255)           # White
SECONDARY_TEXT = (161, 161, 161)       # #A1A1A1

# Paths relative to this file
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR.parent / "thumbnails"

FONT_BOLD_PATH = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR_PATH = FONTS_DIR / "Inter-Regular.ttf"


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font, falling back to the built-in default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


# ---------------------------------------------------------------------------
# Shape drawing helpers (all draw onto an RGBA overlay for transparency)
# ---------------------------------------------------------------------------

def _draw_circle(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
) -> None:
    """Draw a filled circle centered at (cx, cy)."""
    draw.ellipse(
        [
            (cx - radius, cy - radius),
            (cx + radius, cy + radius),
        ],
        fill=color,
    )


def _draw_circle_ring(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
    width: int = 3,
) -> None:
    """Draw an unfilled circle ring (stroke only)."""
    draw.ellipse(
        [
            (cx - radius, cy - radius),
            (cx + radius, cy + radius),
        ],
        outline=color,
        width=width,
    )


def _draw_triangle(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    rotation_deg: float,
    color: tuple,
) -> None:
    """Draw an equilateral triangle centered at (cx, cy), rotated."""
    angle_rad = math.radians(rotation_deg)
    points = []
    for i in range(3):
        a = angle_rad + math.radians(i * 120 - 90)
        px = cx + size * math.cos(a)
        py = cy + size * math.sin(a)
        points.append((px, py))
    draw.polygon(points, fill=color)


def _draw_triangle_outline(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    rotation_deg: float,
    color: tuple,
    width: int = 3,
) -> None:
    """Draw a triangle outline (stroke only)."""
    angle_rad = math.radians(rotation_deg)
    points = []
    for i in range(3):
        a = angle_rad + math.radians(i * 120 - 90)
        px = cx + size * math.cos(a)
        py = cy + size * math.sin(a)
        points.append((px, py))
    # Close the polygon by repeating the first point
    points.append(points[0])
    draw.line(points, fill=color, width=width, joint="curve")


def _draw_hexagon(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    rotation_deg: float,
    color: tuple,
) -> None:
    """Draw a regular hexagon centered at (cx, cy), rotated."""
    angle_rad = math.radians(rotation_deg)
    points = []
    for i in range(6):
        a = angle_rad + math.radians(i * 60)
        px = cx + size * math.cos(a)
        py = cy + size * math.sin(a)
        points.append((px, py))
    draw.polygon(points, fill=color)


def _draw_hexagon_outline(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    rotation_deg: float,
    color: tuple,
    width: int = 3,
) -> None:
    """Draw a hexagon outline (stroke only)."""
    angle_rad = math.radians(rotation_deg)
    points = []
    for i in range(6):
        a = angle_rad + math.radians(i * 60)
        px = cx + size * math.cos(a)
        py = cy + size * math.sin(a)
        points.append((px, py))
    points.append(points[0])
    draw.line(points, fill=color, width=width, joint="curve")


def _draw_diamond(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    w: float,
    h: float,
    color: tuple,
) -> None:
    """Draw a diamond (rhombus) shape."""
    points = [
        (cx, cy - h),       # top
        (cx + w, cy),       # right
        (cx, cy + h),       # bottom
        (cx - w, cy),       # left
    ]
    draw.polygon(points, fill=color)


def _draw_cross(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    size: float,
    color: tuple,
    width: int = 2,
) -> None:
    """Draw a plus/cross marker."""
    draw.line([(cx - size, cy), (cx + size, cy)], fill=color, width=width)
    draw.line([(cx, cy - size), (cx, cy + size)], fill=color, width=width)


def _draw_dashed_arc(
    draw: ImageDraw.ImageDraw,
    cx: float,
    cy: float,
    radius: float,
    start_deg: float,
    end_deg: float,
    color: tuple,
    dash_len: int = 12,
    gap_len: int = 8,
    width: int = 2,
) -> None:
    """Draw a dashed circular arc segment for extra detail."""
    total_deg = end_deg - start_deg
    circumference = 2 * math.pi * radius * (total_deg / 360)
    segment_len = dash_len + gap_len
    num_segments = max(1, int(circumference / segment_len))

    for i in range(num_segments):
        frac_start = i / num_segments
        frac_end = (i + dash_len / segment_len) / num_segments
        a1 = math.radians(start_deg + total_deg * frac_start)
        a2 = math.radians(start_deg + total_deg * frac_end)
        x1 = cx + radius * math.cos(a1)
        y1 = cy + radius * math.sin(a1)
        x2 = cx + radius * math.cos(a2)
        y2 = cy + radius * math.sin(a2)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=width)


def _rgba(r: int, g: int, b: int, alpha_fraction: float) -> tuple:
    """Convert RGB + alpha fraction (0.0-1.0) to RGBA tuple."""
    return (r, g, b, int(alpha_fraction * 255))


# ---------------------------------------------------------------------------
# Main composition
# ---------------------------------------------------------------------------

def _draw_geometric_shapes(overlay: Image.Image) -> None:
    """Draw all geometric shapes onto the RGBA overlay image.

    The shapes are carefully positioned to:
    - Cluster toward the right side and edges, leaving left-center clear for text
    - Use varying opacities (15-30%) to create depth layers
    - Mix filled shapes with outlines for visual variety
    - Feel dynamic and asymmetric
    """
    draw = ImageDraw.Draw(overlay)

    lime = ACCENT_COLOR  # (229, 255, 0)

    # -----------------------------------------------------------------------
    # Layer 1: Deep background shapes (very low opacity, large, partially off-canvas)
    # -----------------------------------------------------------------------

    # Giant circle bleeding off the top-right corner
    _draw_circle(draw, 1050, -80, 320, _rgba(*lime, 0.08))

    # Large hexagon bottom-left, partially off-canvas
    _draw_hexagon(draw, -40, 580, 200, rotation_deg=15, color=_rgba(*lime, 0.06))

    # Massive triangle far right, rotated, bleeds off edge
    _draw_triangle(draw, 1300, 350, 280, rotation_deg=25, color=_rgba(*lime, 0.07))

    # -----------------------------------------------------------------------
    # Layer 2: Mid-ground shapes (medium opacity, creating the core composition)
    # -----------------------------------------------------------------------

    # Large filled circle right-center -- the dominant shape
    _draw_circle(draw, 920, 280, 180, _rgba(*lime, 0.15))

    # Hexagon overlapping the circle from above-right
    _draw_hexagon(draw, 1060, 150, 130, rotation_deg=0, color=_rgba(*lime, 0.12))

    # Triangle pointing up-left, creating diagonal tension
    _draw_triangle(draw, 780, 480, 140, rotation_deg=-15, color=_rgba(*lime, 0.18))

    # Diamond shape at top-center for asymmetry
    _draw_diamond(draw, 650, 30, 60, 90, _rgba(*lime, 0.10))

    # Medium circle at bottom-right
    _draw_circle(draw, 1120, 530, 110, _rgba(*lime, 0.14))

    # -----------------------------------------------------------------------
    # Layer 3: Foreground outlines (higher opacity strokes for crisp detail)
    # -----------------------------------------------------------------------

    # Circle ring overlapping the large filled circle
    _draw_circle_ring(draw, 980, 220, 140, _rgba(*lime, 0.30), width=2)

    # Hexagon outline floating top-right
    _draw_hexagon_outline(draw, 1100, 80, 90, rotation_deg=30, color=_rgba(*lime, 0.25), width=2)

    # Triangle outline bottom-center-right
    _draw_triangle_outline(draw, 850, 550, 100, rotation_deg=10, color=_rgba(*lime, 0.22), width=2)

    # Small circle ring as a detail element
    _draw_circle_ring(draw, 700, 120, 50, _rgba(*lime, 0.20), width=2)

    # Another small hexagon outline left of the text zone as subtle decoration
    _draw_hexagon_outline(draw, 150, 500, 45, rotation_deg=10, color=_rgba(*lime, 0.12), width=2)

    # -----------------------------------------------------------------------
    # Layer 4: Accent dots and small detail shapes (high opacity, tiny)
    # -----------------------------------------------------------------------

    # Bright small filled circles as punctuation marks
    _draw_circle(draw, 1140, 300, 12, _rgba(*lime, 0.50))
    _draw_circle(draw, 760, 60, 8, _rgba(*lime, 0.40))
    _draw_circle(draw, 1000, 500, 10, _rgba(*lime, 0.35))
    _draw_circle(draw, 500, 580, 6, _rgba(*lime, 0.30))

    # Tiny triangle accents
    _draw_triangle(draw, 680, 560, 18, rotation_deg=45, color=_rgba(*lime, 0.28))
    _draw_triangle(draw, 1170, 180, 14, rotation_deg=-20, color=_rgba(*lime, 0.35))

    # Cross/plus markers as detail elements
    _draw_cross(draw, 820, 100, 10, _rgba(*lime, 0.35), width=2)
    _draw_cross(draw, 1150, 430, 8, _rgba(*lime, 0.30), width=2)
    _draw_cross(draw, 450, 520, 6, _rgba(*lime, 0.20), width=1)

    # Dashed arc for extra sophistication
    _draw_dashed_arc(draw, 920, 280, 220, -30, 120, _rgba(*lime, 0.18), width=2)
    _draw_dashed_arc(draw, 1060, 150, 170, 150, 280, _rgba(*lime, 0.12), width=1)

    # -----------------------------------------------------------------------
    # Layer 5: Connecting lines for visual flow
    # -----------------------------------------------------------------------

    # Diagonal line from top-left area down to the shapes cluster
    draw.line(
        [(350, 0), (750, 350)],
        fill=_rgba(*lime, 0.07),
        width=1,
    )

    # Line from bottom-left toward the circle cluster
    draw.line(
        [(0, 500), (600, 400)],
        fill=_rgba(*lime, 0.06),
        width=1,
    )

    # Short accent line near the shapes
    draw.line(
        [(900, 100), (1050, 200)],
        fill=_rgba(*lime, 0.18),
        width=2,
    )

    # Horizontal accent line crossing the composition
    draw.line(
        [(600, 315), (1200, 315)],
        fill=_rgba(*lime, 0.10),
        width=1,
    )

    # Angular accent lines for dynamism
    draw.line(
        [(750, 450), (900, 380)],
        fill=_rgba(*lime, 0.12),
        width=1,
    )
    draw.line(
        [(1000, 80), (1180, 140)],
        fill=_rgba(*lime, 0.10),
        width=1,
    )


def _draw_noise_grain(base: Image.Image) -> None:
    """Add extremely subtle noise/grain texture for richness.

    Instead of random noise (which needs numpy), we draw a fine pattern of
    tiny dots at very low opacity across the image.
    """
    grain_overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    grain_draw = ImageDraw.Draw(grain_overlay)

    # Create a subtle cross-hatch pattern
    step = 6
    for x in range(0, IMG_WIDTH, step):
        for y in range(0, IMG_HEIGHT, step):
            # Alternate between slightly lighter and slightly darker dots
            if (x + y) % (step * 2) == 0:
                grain_draw.point((x, y), fill=(255, 255, 255, 3))
            elif (x * y) % (step * 3) == 0:
                grain_draw.point((x, y), fill=(229, 255, 0, 2))

    base.paste(Image.alpha_composite(
        base.convert("RGBA"),
        grain_overlay,
    ))


def _draw_subtle_glow(overlay: Image.Image) -> None:
    """Draw soft radial glow spots to enhance depth around shape clusters."""
    draw = ImageDraw.Draw(overlay)

    # Glow behind the main circle cluster (right-center)
    for i in range(60, 0, -1):
        radius = i * 5
        alpha = max(1, int(3 * (60 - i) / 60))
        _draw_circle(draw, 950, 300, radius, _rgba(229, 255, 0, alpha / 255))

    # Smaller glow near bottom-right shapes
    for i in range(30, 0, -1):
        radius = i * 4
        alpha = max(1, int(2 * (30 - i) / 30))
        _draw_circle(draw, 1100, 520, radius, _rgba(229, 255, 0, alpha / 255))


def generate_geometric_thumbnail(
    title: str,
    tag: str,
    output_path: Optional[str] = None,
) -> Image.Image:
    """Generate a Geometric Abstract style thumbnail.

    Args:
        title: Article title to display (will be word-wrapped).
        tag: Tag label shown in the accent pill at top-left.
        output_path: If provided, saves the PNG to this path.

    Returns:
        The generated PIL Image object.
    """
    # --- Base canvas ---
    base = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (*BG_COLOR, 255))

    # --- Glow layer (behind shapes) ---
    glow_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    _draw_subtle_glow(glow_layer)
    base = Image.alpha_composite(base, glow_layer)

    # --- Geometric shapes layer ---
    shape_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    _draw_geometric_shapes(shape_layer)
    base = Image.alpha_composite(base, shape_layer)

    # --- Vignette: darken edges for focus ---
    vignette = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    vig_draw = ImageDraw.Draw(vignette)

    # Top edge gradient
    for y in range(80):
        alpha = int(60 * (1 - y / 80))
        vig_draw.line([(0, y), (IMG_WIDTH, y)], fill=(0, 0, 0, alpha))

    # Bottom edge gradient
    for y in range(80):
        alpha = int(60 * (1 - y / 80))
        vig_draw.line([(0, IMG_HEIGHT - 1 - y), (IMG_WIDTH, IMG_HEIGHT - 1 - y)], fill=(0, 0, 0, alpha))

    # Left edge gradient (stronger to protect text readability)
    for x in range(100):
        alpha = int(40 * (1 - x / 100))
        vig_draw.line([(x, 0), (x, IMG_HEIGHT)], fill=(0, 0, 0, alpha))

    base = Image.alpha_composite(base, vignette)

    # --- Text overlay layer ---
    text_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)

    # Load fonts
    title_font = _load_font(FONT_BOLD_PATH, 62)
    tag_font = _load_font(FONT_REGULAR_PATH, 18)
    brand_font = _load_font(FONT_BOLD_PATH, 22)
    url_font = _load_font(FONT_REGULAR_PATH, 16)

    # --- Tag pill (top-left) ---
    tag_text = tag.upper()
    tag_bbox = text_draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]

    pill_x = 60
    pill_y = 50
    pill_pad_x = 16
    pill_pad_y = 8

    # Pill background
    text_draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pill_pad_x * 2, pill_y + tag_h + pill_pad_y * 2),
        ],
        radius=6,
        fill=(*ACCENT_COLOR, 255),
    )

    # Pill text
    text_draw.text(
        (pill_x + pill_pad_x, pill_y + pill_pad_y),
        tag_text,
        fill=(*BG_COLOR, 255),
        font=tag_font,
    )

    # --- Title text (bold, wrapped, with text shadow for contrast) ---
    wrapped_title = textwrap.fill(title, width=22)
    lines = wrapped_title.split("\n")[:3]
    wrapped_title = "\n".join(lines)

    title_x = 60
    title_y = 110

    # Measure title block size for scrim
    title_bbox = text_draw.multiline_textbbox(
        (title_x, title_y), wrapped_title, font=title_font, spacing=14
    )

    # Draw a soft dark scrim behind the title text for guaranteed readability
    scrim_pad = 20
    scrim_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    scrim_draw = ImageDraw.Draw(scrim_layer)
    scrim_draw.rounded_rectangle(
        [
            (title_bbox[0] - scrim_pad, title_bbox[1] - scrim_pad),
            (title_bbox[2] + scrim_pad * 2, title_bbox[3] + scrim_pad),
        ],
        radius=12,
        fill=(10, 10, 10, 120),
    )
    # Composite the scrim into the text layer
    text_layer = Image.alpha_composite(text_layer, scrim_layer)
    # Recreate draw object after composite
    text_draw = ImageDraw.Draw(text_layer)

    # Text shadow for extra depth (larger offset for bigger text)
    shadow_offset = 3
    text_draw.multiline_text(
        (title_x + shadow_offset, title_y + shadow_offset),
        wrapped_title,
        fill=(0, 0, 0, 180),
        font=title_font,
        spacing=14,
    )

    # Main title text
    text_draw.multiline_text(
        (title_x, title_y),
        wrapped_title,
        fill=(*TEXT_COLOR, 255),
        font=title_font,
        spacing=14,
    )

    # --- Bottom branding bar ---
    # Semi-transparent dark strip at bottom for brand area
    text_draw.rectangle(
        [(0, IMG_HEIGHT - 60), (IMG_WIDTH, IMG_HEIGHT)],
        fill=(10, 10, 10, 180),
    )

    # TendHunt brand name
    brand_x = 60
    brand_y = IMG_HEIGHT - 48
    text_draw.text(
        (brand_x, brand_y),
        "TendHunt",
        fill=(*ACCENT_COLOR, 255),
        font=brand_font,
    )

    # URL next to brand
    brand_bbox = text_draw.textbbox((brand_x, brand_y), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 14
    text_draw.text(
        (url_x, brand_y + 3),
        "tendhunt.com/blog",
        fill=(*SECONDARY_TEXT, 230),
        font=url_font,
    )

    # Accent line separator above brand bar
    text_draw.line(
        [(60, IMG_HEIGHT - 62), (300, IMG_HEIGHT - 62)],
        fill=(*ACCENT_COLOR, 80),
        width=2,
    )

    base = Image.alpha_composite(base, text_layer)

    # --- Convert to RGB for PNG output ---
    final = base.convert("RGB")

    if output_path:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        final.save(str(out), "PNG", optimize=True)
        print(f"  Saved: {out}")

    return final


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        cli_title = sys.argv[1]
        cli_tag = sys.argv[2]
        cli_output = sys.argv[3]
    else:
        cli_title = "How to Find UK Government Tenders in 2026"
        cli_tag = "UK Procurement"
        cli_output = str(THUMBNAILS_DIR / "test_style_01.png")

    print(f"Style 01 Geometric Abstract")
    print(f"  Title: {cli_title}")
    print(f"  Tag:   {cli_tag}")
    print(f"  Output: {cli_output}")
    print()

    generate_geometric_thumbnail(cli_title, cli_tag, cli_output)
    print("Done.")
