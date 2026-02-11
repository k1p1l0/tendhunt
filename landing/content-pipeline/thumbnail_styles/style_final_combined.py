"""Style Final Combined: Hacked Radar Display thumbnail generator.

Combines brutalist deconstructed aesthetics (style 10) with radar/scanning
intelligence (style 08) into a single cohesive design -- surveillance meets
street art.

FROM BRUTALIST (style 10):
- Giant "UK" and pound sign watermark at very low opacity
- Title text slightly rotated (-2 degrees) for punk energy
- Raw bracket tag style [ UK PROCUREMENT ] with strikethrough
- Corner bracket crop marks
- Rotated geometric rectangles with thick borders
- Diagonal slash lines crossing the composition
- TENDHUNT branding at bottom
- Intentional grid-breaking, anti-corporate energy

FROM RADAR (style 08):
- Concentric rings/arcs emanating from the right side
- Dashed and dotted circle line styles
- Data blips/nodes with glow on the rings
- Radar sweep line with gradient glow cone
- Crosshair marks
- Scanning/detecting intelligence feel

COMBINED RESULT:
A hacked radar display -- intelligence technology deconstructed and
reassembled with raw energy. Broken ring arcs, geometric rectangles
overlapping radar rings, diagonal lines cutting through everything,
data blips scattered along both rings and geometric shapes.

Uses Pillow only. 1200x630 PNG.
Fonts: SpaceGrotesk-Bold.ttf and Inter-Regular.ttf in ../fonts/.

Usage:
    python style_final_combined.py
    python style_final_combined.py "Custom Title" "Custom Tag" output.png
"""

import math
import random
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)               # #0A0A0A
LIME = (229, 255, 0)                   # #E5FF00
WHITE = (255, 255, 255)
NEAR_BLACK = (14, 14, 14)

# Radar ring center -- pushed off the right edge so arcs sweep into view
RING_CENTER_X = IMG_WIDTH + 80
RING_CENTER_Y = IMG_HEIGHT // 2 + 20

# Font paths (relative to this file -> ../fonts/)
FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# Output defaults
THUMBNAILS_DIR = Path(__file__).resolve().parent.parent / "thumbnails"


# ---------------------------------------------------------------------------
# Font loading
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the built-in default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


# ---------------------------------------------------------------------------
# Geometry helpers (from brutalist)
# ---------------------------------------------------------------------------

def _rotated_rect(
    canvas_size: tuple[int, int],
    center: tuple[int, int],
    width: int,
    height: int,
    angle_deg: float,
    fill: tuple[int, ...] | None = None,
    outline: tuple[int, ...] | None = None,
    outline_width: int = 0,
) -> Image.Image:
    """Draw a filled/outlined rectangle rotated by *angle_deg* and return as
    an RGBA image the same size as *canvas_size*, ready for compositing."""
    diag = int(math.hypot(width, height)) + outline_width * 2 + 4
    layer = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = (diag - width) // 2
    y0 = (diag - height) // 2
    x1 = x0 + width
    y1 = y0 + height

    if fill:
        d.rectangle([x0, y0, x1, y1], fill=fill)
    if outline and outline_width:
        d.rectangle([x0, y0, x1, y1], outline=outline, width=outline_width)

    rotated = layer.rotate(angle_deg, resample=Image.BICUBIC, expand=False)

    result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    paste_x = center[0] - diag // 2
    paste_y = center[1] - diag // 2
    result.paste(rotated, (paste_x, paste_y), rotated)
    return result


def _rotated_text(
    canvas_size: tuple[int, int],
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
    angle_deg: float,
) -> Image.Image:
    """Render *text* rotated by *angle_deg* around its top-left *position*
    and return as an RGBA layer."""
    tmp = Image.new("RGBA", (1, 1))
    tmp_d = ImageDraw.Draw(tmp)
    bbox = tmp_d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0] + 20
    th = bbox[3] - bbox[1] + 20

    text_layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_layer)
    td.text((10, 10 - bbox[1]), text, fill=fill, font=font)

    diag = int(math.hypot(tw, th)) + 4
    padded = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    px = (diag - tw) // 2
    py = (diag - th) // 2
    padded.paste(text_layer, (px, py), text_layer)
    rotated = padded.rotate(angle_deg, resample=Image.BICUBIC, expand=False)

    result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    paste_x = position[0] - diag // 2 + tw // 2
    paste_y = position[1] - diag // 2 + th // 2
    result.paste(rotated, (paste_x, paste_y), rotated)
    return result


def _multiline_rotated_text(
    canvas_size: tuple[int, int],
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, ...],
    angle_deg: float,
    line_spacing: int = 14,
) -> Image.Image:
    """Render multiline *text* rotated by *angle_deg* as a single block."""
    lines = text.split("\n")

    tmp = Image.new("RGBA", (1, 1))
    tmp_d = ImageDraw.Draw(tmp)
    max_w = 0
    total_h = 0
    line_heights = []
    for line in lines:
        bbox = tmp_d.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        max_w = max(max_w, lw)
        line_heights.append(lh)
        total_h += lh
    total_h += line_spacing * (len(lines) - 1)

    padding = 20
    block_w = max_w + padding * 2
    block_h = total_h + padding * 2

    block = Image.new("RGBA", (block_w, block_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(block)
    y_cursor = padding
    for i, line in enumerate(lines):
        bbox = bd.textbbox((0, 0), line, font=font)
        bd.text((padding, y_cursor - bbox[1]), line, fill=fill, font=font)
        y_cursor += line_heights[i] + line_spacing

    diag = int(math.hypot(block_w, block_h)) + 4
    padded = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    px = (diag - block_w) // 2
    py = (diag - block_h) // 2
    padded.paste(block, (px, py), block)
    rotated = padded.rotate(angle_deg, resample=Image.BICUBIC, expand=False)

    result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    paste_x = position[0] - diag // 2 + block_w // 2
    paste_y = position[1] - diag // 2 + block_h // 2
    result.paste(rotated, (paste_x, paste_y), rotated)
    return result


# ---------------------------------------------------------------------------
# Radar / ring helpers (from concentric)
# ---------------------------------------------------------------------------

def _draw_dashed_arc(
    draw: ImageDraw.Draw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
    start_deg: float = 0,
    end_deg: float = 360,
    dash_length: float = 12,
    gap_length: float = 8,
    width: int = 1,
) -> None:
    """Draw a dashed arc segment. Supports partial arcs (not just full circles)."""
    circumference = 2 * math.pi * radius
    if circumference <= 0:
        return
    dash_angle = (dash_length / circumference) * 360
    gap_angle = (gap_length / circumference) * 360
    step = dash_angle + gap_angle

    angle = start_deg
    while angle < end_deg:
        seg_end = min(angle + dash_angle, end_deg)
        bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
        draw.arc(bbox, start=angle, end=seg_end, fill=color, width=width)
        angle += step


def _draw_dotted_arc(
    draw: ImageDraw.Draw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
    start_deg: float = 0,
    end_deg: float = 360,
    dot_spacing: float = 14,
    dot_radius: float = 1.5,
) -> None:
    """Draw a dotted arc segment using small filled circles."""
    arc_length_deg = end_deg - start_deg
    arc_length_px = (arc_length_deg / 360) * 2 * math.pi * radius
    if arc_length_px <= 0:
        return
    num_dots = max(1, int(arc_length_px / dot_spacing))
    for i in range(num_dots):
        frac = i / max(1, num_dots - 1) if num_dots > 1 else 0
        angle_deg = start_deg + frac * arc_length_deg
        angle_rad = math.radians(angle_deg)
        dx = cx + radius * math.cos(angle_rad)
        dy = cy + radius * math.sin(angle_rad)
        draw.ellipse(
            [dx - dot_radius, dy - dot_radius, dx + dot_radius, dy + dot_radius],
            fill=color,
        )


def _draw_crosshair(
    draw: ImageDraw.Draw,
    cx: float,
    cy: float,
    size: float,
    color: tuple,
    width: int = 2,
) -> None:
    """Draw a crosshair/target mark at the given center."""
    gap = 6
    draw.line([(cx - size, cy), (cx - gap, cy)], fill=color, width=width)
    draw.line([(cx + gap, cy), (cx + size, cy)], fill=color, width=width)
    draw.line([(cx, cy - size), (cx, cy - gap)], fill=color, width=width)
    draw.line([(cx, cy + gap), (cx, cy + size)], fill=color, width=width)
    draw.ellipse(
        [cx - 2, cy - 2, cx + 2, cy + 2],
        fill=color,
    )


def _draw_data_blip(
    draw: ImageDraw.Draw,
    x: float,
    y: float,
    color: tuple,
    size: float = 4,
    glow: bool = False,
) -> None:
    """Draw a small radar data blip with optional glow."""
    if glow:
        glow_color = (color[0], color[1], color[2], 40)
        glow_size = size * 3
        draw.ellipse(
            [x - glow_size, y - glow_size, x + glow_size, y + glow_size],
            fill=glow_color,
        )
    draw.ellipse(
        [x - size, y - size, x + size, y + size],
        fill=color,
    )


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_thumbnail(
    title: str,
    tag: str,
    output_path: str | Path,
) -> Path:
    """Generate a hacked-radar-display style blog thumbnail.

    Combines brutalist deconstructed aesthetics with radar/scanning
    intelligence into a single cohesive design.

    Args:
        title: Article title to display.
        tag: Primary tag shown as raw bracketed label.
        output_path: Where to save the PNG.

    Returns:
        Resolved Path to the saved image.
    """
    rng = random.Random(42)
    canvas = (IMG_WIDTH, IMG_HEIGHT)
    img = Image.new("RGBA", canvas, BG_COLOR + (255,))

    # ==================================================================
    # LAYER 1 -- UK / pound sign watermark (from brutalist)
    # Giant characters at very low opacity, bleeding off edges
    # ==================================================================
    watermark_font = _load_font(FONT_BOLD, 320)
    wm_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    wm_draw = ImageDraw.Draw(wm_layer)
    wm_draw.text(
        (20, 90),
        "UK",
        fill=LIME[:3] + (20,),
        font=watermark_font,
    )

    wm_font_2 = _load_font(FONT_BOLD, 420)
    wm_draw.text(
        (620, -40),
        "\u00a3",  # Pound sign
        fill=LIME[:3] + (15,),
        font=wm_font_2,
    )
    img = Image.alpha_composite(img, wm_layer)

    # ==================================================================
    # LAYER 2 -- Subtle radial gradient behind radar center
    # Gives the rings area a faint glow without overpowering
    # ==================================================================
    gradient_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient_layer, "RGBA")
    for r in range(700, 0, -12):
        alpha = max(0, int(6 * (1 - r / 700)))
        gradient_draw.ellipse(
            [
                RING_CENTER_X - r,
                RING_CENTER_Y - r,
                RING_CENTER_X + r,
                RING_CENTER_Y + r,
            ],
            fill=LIME[:3] + (alpha,),
        )
    img = Image.alpha_composite(img, gradient_layer)

    # ==================================================================
    # LAYER 3 -- Concentric radar rings with BROKEN arcs
    # Rings emanate from right side. Some arcs are deliberately
    # interrupted (brutalist disruption) -- gaps in the scanning field.
    # ==================================================================
    ring_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring_layer, "RGBA")

    ring_configs = [
        # (radius, style, start_deg, end_deg) -- partial arcs = broken rings
        (130,  "solid",   90,  340),
        (210,  "dashed",  70,  310),
        (300,  "dotted",  50,  350),
        (400,  "solid",  100,  280),  # Intentionally short arc -- broken
        (400,  "solid",  295,  345),  # Second fragment of the same ring
        (510,  "dashed",  60,  330),
        (640,  "dotted",  80,  340),
        (780,  "dashed",  45,  350),
    ]

    for i, (radius, style, start_deg, end_deg) in enumerate(ring_configs):
        opacity = max(15, int(160 - i * 16))
        ring_color = LIME[:3] + (opacity,)

        if style == "solid":
            bbox = [
                RING_CENTER_X - radius,
                RING_CENTER_Y - radius,
                RING_CENTER_X + radius,
                RING_CENTER_Y + radius,
            ]
            ring_draw.arc(bbox, start=start_deg, end=end_deg, fill=ring_color, width=1)
        elif style == "dashed":
            _draw_dashed_arc(
                ring_draw,
                RING_CENTER_X, RING_CENTER_Y,
                radius, ring_color,
                start_deg=start_deg, end_deg=end_deg,
                dash_length=14 + i * 2,
                gap_length=10 + i,
                width=1,
            )
        elif style == "dotted":
            _draw_dotted_arc(
                ring_draw,
                RING_CENTER_X, RING_CENTER_Y,
                radius, ring_color,
                start_deg=start_deg, end_deg=end_deg,
                dot_spacing=12 + i * 2,
                dot_radius=1.2 + i * 0.1,
            )

    img = Image.alpha_composite(img, ring_layer)

    # ==================================================================
    # LAYER 4 -- Crosshair marks on rings
    # Primary crosshair at center, secondary marks where arcs
    # intersect the visible canvas
    # ==================================================================
    xhair_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    xhair_draw = ImageDraw.Draw(xhair_layer, "RGBA")

    # Primary crosshair at ring center (mostly off-screen, arms visible)
    _draw_crosshair(
        xhair_draw,
        RING_CENTER_X, RING_CENTER_Y,
        size=30, color=LIME[:3] + (120,), width=2,
    )

    # Secondary crosshairs on inner rings at 180 degrees (facing into canvas)
    for radius in [130, 210]:
        mark_x = RING_CENTER_X + radius * math.cos(math.radians(180))
        mark_y = RING_CENTER_Y + radius * math.sin(math.radians(180))
        if 0 <= mark_x <= IMG_WIDTH and 0 <= mark_y <= IMG_HEIGHT:
            _draw_crosshair(
                xhair_draw,
                mark_x, mark_y,
                size=10, color=LIME[:3] + (70,), width=1,
            )

    # Extra crosshair at an unusual angle (brutalist disruption)
    for angle_deg in [145, 235]:
        mark_x = RING_CENTER_X + 300 * math.cos(math.radians(angle_deg))
        mark_y = RING_CENTER_Y + 300 * math.sin(math.radians(angle_deg))
        if 0 <= mark_x <= IMG_WIDTH and 0 <= mark_y <= IMG_HEIGHT:
            _draw_crosshair(
                xhair_draw,
                mark_x, mark_y,
                size=8, color=WHITE[:3] + (40,), width=1,
            )

    img = Image.alpha_composite(img, xhair_layer)

    # ==================================================================
    # LAYER 5 -- Data blips on radar rings (from concentric)
    # Blips with glow, scattered along the ring arcs
    # ==================================================================
    blip_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    blip_draw = ImageDraw.Draw(blip_layer, "RGBA")

    ring_radii = [130, 210, 300, 400, 510, 640, 780]
    blip_configs = [
        # (ring_index, angle_degrees, size, glow)
        (1, 160, 4, True),
        (1, 220, 3, False),
        (2, 135, 5, True),
        (2, 180, 3, False),
        (2, 250, 4, True),
        (3, 150, 3, False),
        (3, 200, 5, True),
        (4, 145, 4, True),
        (4, 195, 3, False),
        (4, 270, 4, False),
        (5, 125, 4, True),
        (5, 175, 3, False),
        (5, 220, 4, True),
        (5, 290, 3, False),
        (6, 140, 3, True),
        (6, 190, 4, True),
        (6, 260, 3, False),
    ]

    for ring_idx, angle_deg, blip_size, glow in blip_configs:
        if ring_idx >= len(ring_radii):
            continue
        radius = ring_radii[ring_idx]
        angle_rad = math.radians(angle_deg)
        bx = RING_CENTER_X + radius * math.cos(angle_rad)
        by = RING_CENTER_Y + radius * math.sin(angle_rad)
        if -10 <= bx <= IMG_WIDTH + 10 and -10 <= by <= IMG_HEIGHT + 10:
            blip_opacity = max(60, int(220 - ring_idx * 25))
            blip_color = LIME[:3] + (blip_opacity,)
            _draw_data_blip(blip_draw, bx, by, blip_color, size=blip_size, glow=glow)

    # Ambient noise dots scattered across the radar zone
    for _ in range(25):
        dx = rng.randint(int(IMG_WIDTH * 0.4), IMG_WIDTH)
        dy = rng.randint(0, IMG_HEIGHT)
        dot_alpha = rng.randint(12, 45)
        dot_size = rng.uniform(0.5, 1.5)
        blip_draw.ellipse(
            [dx - dot_size, dy - dot_size, dx + dot_size, dy + dot_size],
            fill=LIME[:3] + (dot_alpha,),
        )

    img = Image.alpha_composite(img, blip_layer)

    # ==================================================================
    # LAYER 6 -- Geometric rectangles (from brutalist)
    # Rotated, overlapping with the radar rings for visual tension
    # ==================================================================

    # Large lime rectangle -- overlaps outer radar rings
    lime_rect = _rotated_rect(
        canvas,
        center=(960, 300),
        width=480,
        height=700,
        angle_deg=12,
        fill=LIME + (35,),
        outline=LIME + (90,),
        outline_width=5,
    )
    img = Image.alpha_composite(img, lime_rect)

    # White-bordered rectangle -- rotated opposite, cuts through rings
    white_rect = _rotated_rect(
        canvas,
        center=(800, 160),
        width=300,
        height=210,
        angle_deg=-8,
        fill=None,
        outline=WHITE + (65,),
        outline_width=4,
    )
    img = Image.alpha_composite(img, white_rect)

    # Small solid lime square -- aggressively rotated, lower left
    small_lime = _rotated_rect(
        canvas,
        center=(140, 500),
        width=90,
        height=90,
        angle_deg=18,
        fill=LIME + (45,),
        outline=WHITE + (30,),
        outline_width=2,
    )
    img = Image.alpha_composite(img, small_lime)

    # Tall narrow bar -- right edge, disrupting outer rings
    tall_bar = _rotated_rect(
        canvas,
        center=(1100, 480),
        width=50,
        height=260,
        angle_deg=-14,
        fill=WHITE + (15,),
        outline=WHITE + (40,),
        outline_width=3,
    )
    img = Image.alpha_composite(img, tall_bar)

    # ==================================================================
    # LAYER 7 -- Data blips on geometric shapes (not just rings)
    # Blips scattered along the rectangle edges for a hacked feel
    # ==================================================================
    geo_blip_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    geo_blip_draw = ImageDraw.Draw(geo_blip_layer, "RGBA")

    geo_blip_positions = [
        # (x, y, size, glow) -- placed along geometric shape edges
        (870, 110, 3, True),
        (920, 230, 4, False),
        (1040, 180, 3, True),
        (750, 90, 3, False),
        (155, 460, 3, True),
        (120, 530, 4, False),
        (1080, 420, 3, True),
        (1120, 530, 3, False),
    ]

    for gx, gy, gs, gg in geo_blip_positions:
        _draw_data_blip(
            geo_blip_draw, gx, gy,
            LIME[:3] + (140,), size=gs, glow=gg,
        )

    img = Image.alpha_composite(img, geo_blip_layer)

    # ==================================================================
    # LAYER 8 -- Diagonal slash lines (from brutalist)
    # These cut through the radar rings, creating disruption
    # ==================================================================
    slash_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    slash_draw = ImageDraw.Draw(slash_layer)

    # Primary lime diagonal -- low, crossing the composition
    slash_draw.line(
        [(0, 490), (IMG_WIDTH, 370)],
        fill=LIME[:3] + (25,),
        width=3,
    )

    # Secondary white diagonal -- steeper, opposite direction
    slash_draw.line(
        [(780, 0), (IMG_WIDTH, IMG_HEIGHT)],
        fill=WHITE[:3] + (14,),
        width=2,
    )

    # Third diagonal -- from brutalist energy, more aggressive angle
    slash_draw.line(
        [(500, 0), (900, IMG_HEIGHT)],
        fill=LIME[:3] + (12,),
        width=1,
    )

    img = Image.alpha_composite(img, slash_layer)

    # ==================================================================
    # LAYER 9 -- Radar sweep line (from concentric)
    # Cutting diagonally across the canvas rather than radially
    # This is the key hybrid: a sweep that follows brutalist diagonals
    # ==================================================================
    sweep_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    sweep_draw = ImageDraw.Draw(sweep_layer, "RGBA")

    # Sweep direction: from ring center toward upper-left, diagonal feel
    sweep_angle = math.radians(160)

    # Multiple overlapping lines for the sweep beam
    for offset in range(-3, 4):
        offset_angle = sweep_angle + math.radians(offset * 0.35)
        sx = RING_CENTER_X + 900 * math.cos(offset_angle)
        sy = RING_CENTER_Y + 900 * math.sin(offset_angle)
        line_alpha = max(4, 35 - abs(offset) * 9)
        sweep_draw.line(
            [(RING_CENTER_X, RING_CENTER_Y), (sx, sy)],
            fill=LIME[:3] + (line_alpha,),
            width=1,
        )

    # Glow cone behind the sweep (triangular gradient)
    cone_spread = 18  # degrees -- wider than original for more drama
    for d in range(-cone_spread, 1):
        a = sweep_angle + math.radians(d)
        ex = RING_CENTER_X + 900 * math.cos(a)
        ey = RING_CENTER_Y + 900 * math.sin(a)
        alpha = max(1, int(10 * (1 - abs(d) / cone_spread)))
        sweep_draw.line(
            [(RING_CENTER_X, RING_CENTER_Y), (ex, ey)],
            fill=LIME[:3] + (alpha,),
            width=1,
        )

    img = Image.alpha_composite(img, sweep_layer)

    # ==================================================================
    # LAYER 10 -- Horizontal disruption bands (from brutalist)
    # Thin lines that cut through everything, like scan artifacts
    # ==================================================================
    band_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    band_draw = ImageDraw.Draw(band_layer)

    band_draw.rectangle(
        [(0, 418), (IMG_WIDTH, 422)],
        fill=LIME[:3] + (28,),
    )
    band_draw.rectangle(
        [(0, 426), (IMG_WIDTH, 428)],
        fill=WHITE[:3] + (14,),
    )

    # Subtle horizontal scan lines across entire image (radar texture)
    for y in range(0, IMG_HEIGHT, 5):
        band_draw.line(
            [(0, y), (IMG_WIDTH, y)],
            fill=(0, 0, 0, 8),
            width=1,
        )

    img = Image.alpha_composite(img, band_layer)

    # ==================================================================
    # LAYER 11 -- Accent bar, left edge bleed (from brutalist)
    # ==================================================================
    accent_bar = _rotated_rect(
        canvas,
        center=(-15, 340),
        width=65,
        height=260,
        angle_deg=6,
        fill=LIME + (75,),
    )
    img = Image.alpha_composite(img, accent_bar)

    # ==================================================================
    # LAYER 12 -- Tag as raw bracket label [ UK PROCUREMENT ]
    # With strikethrough line (from brutalist)
    # ==================================================================
    tag_font = _load_font(FONT_REGULAR, 18)
    tag_text = f"[ {tag.upper()} ]"

    tag_layer = _rotated_text(
        canvas,
        position=(72, 68),
        text=tag_text,
        font=tag_font,
        fill=LIME + (220,),
        angle_deg=0,  # Stays level for legibility
    )

    # Measure tag for the strikethrough
    tmp = Image.new("RGBA", (1, 1))
    tmp_d = ImageDraw.Draw(tmp)
    tag_bbox = tmp_d.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]

    strike_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    strike_draw = ImageDraw.Draw(strike_layer)
    strike_y = 68 + tag_h // 2 + 2
    strike_draw.line(
        [(70, strike_y), (70 + tag_w + 8, strike_y)],
        fill=LIME[:3] + (55,),
        width=1,
    )

    img = Image.alpha_composite(img, tag_layer)
    img = Image.alpha_composite(img, strike_layer)

    # ==================================================================
    # LAYER 13 -- Title text, bold white, rotated -2 degrees
    # Brutalist typography with punk energy
    # ==================================================================
    title_font = _load_font(FONT_BOLD, 56)
    wrapped_title = textwrap.fill(title, width=22)
    lines = wrapped_title.split("\n")[:3]  # Max 3 lines
    wrapped_title = "\n".join(lines)

    title_layer = _multiline_rotated_text(
        canvas,
        position=(72, 118),
        text=wrapped_title,
        font=title_font,
        fill=WHITE + (255,),
        angle_deg=-2,
        line_spacing=16,
    )
    img = Image.alpha_composite(img, title_layer)

    # ==================================================================
    # LAYER 14 -- Decorative squares cluster (from brutalist, top-right)
    # ==================================================================
    for offset_x, offset_y, sz, ang, alpha in [
        (1040, 50, 32, 24, 40),
        (1085, 78, 22, -14, 30),
        (1015, 95, 16, 40, 24),
        (1065, 115, 10, -6, 18),
    ]:
        sq = _rotated_rect(
            canvas,
            center=(offset_x, offset_y),
            width=sz,
            height=sz,
            angle_deg=ang,
            fill=LIME[:3] + (alpha,),
        )
        img = Image.alpha_composite(img, sq)

    # ==================================================================
    # LAYER 15 -- Corner bracket crop marks (from brutalist)
    # Frame the whole composition -- aggressive, thick
    # ==================================================================
    corner_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner_layer)

    bracket_len = 55
    bracket_width = 4
    inset = 16
    bracket_color = LIME[:3] + (130,)

    # Top-left
    cd.line([(inset, inset), (inset, inset + bracket_len)], fill=bracket_color, width=bracket_width)
    cd.line([(inset, inset), (inset + bracket_len, inset)], fill=bracket_color, width=bracket_width)

    # Top-right
    cd.line(
        [(IMG_WIDTH - inset, inset), (IMG_WIDTH - inset, inset + bracket_len)],
        fill=bracket_color, width=bracket_width,
    )
    cd.line(
        [(IMG_WIDTH - inset, inset), (IMG_WIDTH - inset - bracket_len, inset)],
        fill=bracket_color, width=bracket_width,
    )

    # Bottom-left
    cd.line(
        [(inset, IMG_HEIGHT - inset), (inset, IMG_HEIGHT - inset - bracket_len)],
        fill=bracket_color, width=bracket_width,
    )
    cd.line(
        [(inset, IMG_HEIGHT - inset), (inset + bracket_len, IMG_HEIGHT - inset)],
        fill=bracket_color, width=bracket_width,
    )

    # Bottom-right
    cd.line(
        [(IMG_WIDTH - inset, IMG_HEIGHT - inset), (IMG_WIDTH - inset, IMG_HEIGHT - inset - bracket_len)],
        fill=bracket_color, width=bracket_width,
    )
    cd.line(
        [(IMG_WIDTH - inset, IMG_HEIGHT - inset), (IMG_WIDTH - inset - bracket_len, IMG_HEIGHT - inset)],
        fill=bracket_color, width=bracket_width,
    )

    img = Image.alpha_composite(img, corner_layer)

    # ==================================================================
    # LAYER 16 -- Bottom branding: TENDHUNT (from brutalist)
    # ==================================================================
    brand_font = _load_font(FONT_BOLD, 18)
    url_font = _load_font(FONT_REGULAR, 14)

    brand_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    bd = ImageDraw.Draw(brand_layer)

    # Thin separator line before branding
    bd.line(
        [(72, IMG_HEIGHT - 62), (260, IMG_HEIGHT - 62)],
        fill=WHITE[:3] + (25,),
        width=1,
    )

    # Brand name in lime
    bd.text(
        (72, IMG_HEIGHT - 50),
        "TENDHUNT",
        fill=LIME[:3] + (180,),
        font=brand_font,
    )

    # URL in muted white
    brand_bbox = bd.textbbox((72, IMG_HEIGHT - 50), "TENDHUNT", font=brand_font)
    url_x = brand_bbox[2] + 14
    bd.text(
        (url_x, IMG_HEIGHT - 47),
        "tendhunt.com",
        fill=WHITE[:3] + (75,),
        font=url_font,
    )

    img = Image.alpha_composite(img, brand_layer)

    # ==================================================================
    # LAYER 17 -- Thin accent line along bottom edge (from radar)
    # ==================================================================
    edge_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    edge_draw = ImageDraw.Draw(edge_layer)
    edge_draw.rectangle(
        [(0, IMG_HEIGHT - 3), (IMG_WIDTH, IMG_HEIGHT)],
        fill=LIME[:3] + (50,),
    )
    img = Image.alpha_composite(img, edge_layer)

    # ==================================================================
    # Flatten to RGB and save
    # ==================================================================
    final = img.convert("RGB")
    output = Path(output_path).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(str(output), "PNG", optimize=True)
    print(f"  [style_final_combined] Saved: {output}")
    return output


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    default_title = "How to Find UK Government Tenders in 2026"
    default_tag = "UK Procurement"
    default_output = str(THUMBNAILS_DIR / "test_style_final.png")

    if len(sys.argv) >= 4:
        title = sys.argv[1]
        tag = sys.argv[2]
        out = sys.argv[3]
    else:
        title = default_title
        tag = default_tag
        out = default_output

    print(f"Generating hacked-radar thumbnail: {title}")
    result_path = generate_thumbnail(title, tag, out)
    print(f"Done. Output: {result_path}")
