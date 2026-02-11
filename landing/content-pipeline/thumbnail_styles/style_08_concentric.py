"""Style 08: Concentric Rings / Radar thumbnail generator.

Creates a 1200x630 blog thumbnail with a radar/scanning aesthetic:
- Dark background (#0A0A0A)
- Concentric rings emanating from the right side (partially off-screen)
- Rings in lime (#E5FF00) with decreasing opacity
- Dashed and dotted line styles for ring variety
- Data point blips on the rings (radar display feel)
- Cross-hair / target marks at the ring center
- Title text in bold white on the left
- Tag pill at top-left
- TendHunt branding at bottom

Usage:
    python style_08_concentric.py
"""

import math
import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# === Paths ===
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR / ".." / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR / ".." / "thumbnails"

FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# === Brand Constants ===
IMG_WIDTH = 1200
IMG_HEIGHT = 630
BG_COLOR = (10, 10, 10)  # #0A0A0A
ACCENT_COLOR = (229, 255, 0)  # #E5FF00 (lime)
TEXT_COLOR = (255, 255, 255)  # White
SECONDARY_TEXT = (161, 161, 161)  # #A1A1A1
RING_CENTER_X = IMG_WIDTH + 60  # Center pushed off-screen right
RING_CENTER_Y = IMG_HEIGHT // 2  # Vertically centered


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _draw_dashed_circle(
    draw: ImageDraw.Draw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
    dash_length: float = 12,
    gap_length: float = 8,
    width: int = 1,
) -> None:
    """Draw a dashed circle using short arc segments.

    Args:
        draw: PIL ImageDraw instance.
        cx: Center X coordinate.
        cy: Center Y coordinate.
        radius: Circle radius in pixels.
        color: RGBA or RGB color tuple.
        dash_length: Length of each dash segment in pixels.
        gap_length: Length of each gap between dashes in pixels.
        width: Stroke width.
    """
    circumference = 2 * math.pi * radius
    if circumference <= 0:
        return
    # Convert pixel dash/gap lengths to angles (radians)
    dash_angle = (dash_length / circumference) * 2 * math.pi
    gap_angle = (gap_length / circumference) * 2 * math.pi
    step = dash_angle + gap_angle

    angle = 0.0
    while angle < 2 * math.pi:
        end_angle = min(angle + dash_angle, 2 * math.pi)
        # Convert to degrees for PIL arc
        start_deg = math.degrees(angle)
        end_deg = math.degrees(end_angle)
        bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
        draw.arc(bbox, start=start_deg, end=end_deg, fill=color, width=width)
        angle += step


def _draw_dotted_circle(
    draw: ImageDraw.Draw,
    cx: float,
    cy: float,
    radius: float,
    color: tuple,
    dot_spacing: float = 14,
    dot_radius: float = 1.5,
) -> None:
    """Draw a dotted circle using small filled circles along the circumference.

    Args:
        draw: PIL ImageDraw instance.
        cx: Center X coordinate.
        cy: Center Y coordinate.
        radius: Circle radius in pixels.
        color: RGBA or RGB color tuple.
        dot_spacing: Distance between dots along the arc in pixels.
        dot_radius: Radius of each dot.
    """
    circumference = 2 * math.pi * radius
    if circumference <= 0:
        return
    num_dots = max(1, int(circumference / dot_spacing))
    for i in range(num_dots):
        angle = (2 * math.pi * i) / num_dots
        dx = cx + radius * math.cos(angle)
        dy = cy + radius * math.sin(angle)
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
    """Draw a crosshair/target mark at the given center.

    Args:
        draw: PIL ImageDraw instance.
        cx: Center X.
        cy: Center Y.
        size: Arm length from center.
        color: Line color.
        width: Stroke width.
    """
    gap = 6  # Gap around center point
    # Horizontal arms
    draw.line([(cx - size, cy), (cx - gap, cy)], fill=color, width=width)
    draw.line([(cx + gap, cy), (cx + size, cy)], fill=color, width=width)
    # Vertical arms
    draw.line([(cx, cy - size), (cx, cy - gap)], fill=color, width=width)
    draw.line([(cx, cy + gap), (cx, cy + size)], fill=color, width=width)
    # Small center dot
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
    """Draw a small radar data blip with optional glow effect.

    Args:
        draw: PIL ImageDraw instance.
        x: Blip center X.
        y: Blip center Y.
        color: Blip fill color.
        size: Blip radius.
        glow: Whether to draw a dim glow ring around the blip.
    """
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


def generate_concentric_thumbnail(
    title: str,
    tag: str,
    output_path: str,
) -> None:
    """Generate a concentric rings / radar style blog thumbnail.

    Args:
        title: Article title to display.
        tag: Primary tag shown in the accent pill.
        output_path: File path to save the PNG image.
    """
    # Seed for reproducible blip placement
    rng = random.Random(42)

    # Create RGBA base for alpha compositing
    img = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (*BG_COLOR, 255))
    draw = ImageDraw.Draw(img, "RGBA")

    # --- Background: subtle radial gradient towards center-right ---
    # Drawn as concentric filled circles with very low opacity
    gradient_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    gradient_draw = ImageDraw.Draw(gradient_layer, "RGBA")
    for r in range(700, 0, -10):
        alpha = max(0, int(8 * (1 - r / 700)))  # Very subtle glow
        gradient_draw.ellipse(
            [
                RING_CENTER_X - r,
                RING_CENTER_Y - r,
                RING_CENTER_X + r,
                RING_CENTER_Y + r,
            ],
            fill=(229, 255, 0, alpha),
        )
    img = Image.alpha_composite(img, gradient_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # --- Concentric rings ---
    ring_radii = [120, 200, 290, 390, 500, 620, 760]
    ring_styles = ["solid", "dashed", "dotted", "solid", "dashed", "dotted", "dashed"]

    for i, (radius, style) in enumerate(zip(ring_radii, ring_styles)):
        # Opacity decreases as rings expand outward
        opacity = max(12, int(180 - i * 22))
        ring_color = (229, 255, 0, opacity)

        if style == "solid":
            # Thin solid arc
            draw.arc(
                [
                    RING_CENTER_X - radius,
                    RING_CENTER_Y - radius,
                    RING_CENTER_X + radius,
                    RING_CENTER_Y + radius,
                ],
                start=0,
                end=360,
                fill=ring_color,
                width=1,
            )
        elif style == "dashed":
            _draw_dashed_circle(
                draw,
                RING_CENTER_X,
                RING_CENTER_Y,
                radius,
                ring_color,
                dash_length=14 + i * 2,
                gap_length=10 + i,
                width=1,
            )
        elif style == "dotted":
            _draw_dotted_circle(
                draw,
                RING_CENTER_X,
                RING_CENTER_Y,
                radius,
                ring_color,
                dot_spacing=12 + i * 2,
                dot_radius=1.2 + i * 0.1,
            )

    # --- Crosshair at ring center ---
    crosshair_color = (229, 255, 0, 140)
    _draw_crosshair(draw, RING_CENTER_X, RING_CENTER_Y, size=30, color=crosshair_color, width=2)

    # Secondary smaller crosshair marks on inner rings
    for radius in [120, 200]:
        # Mark at 180 degrees (left side, facing into the visible area)
        mark_x = RING_CENTER_X + radius * math.cos(math.pi)
        mark_y = RING_CENTER_Y + radius * math.sin(math.pi)
        if 0 <= mark_x <= IMG_WIDTH and 0 <= mark_y <= IMG_HEIGHT:
            _draw_crosshair(
                draw, mark_x, mark_y, size=12,
                color=(229, 255, 0, 80), width=1,
            )

    # --- Data blips scattered along rings ---
    blip_configs = [
        # (ring_index, angle_degrees, size, glow)
        (2, 155, 4, True),
        (2, 210, 3, False),
        (3, 130, 5, True),
        (3, 175, 3, False),
        (3, 240, 4, True),
        (4, 145, 3, False),
        (4, 195, 5, True),
        (4, 260, 3, False),
        (5, 120, 4, True),
        (5, 170, 3, False),
        (5, 215, 4, False),
        (5, 280, 3, True),
        (6, 135, 3, False),
        (6, 185, 4, True),
        (6, 250, 3, False),
    ]

    for ring_idx, angle_deg, blip_size, glow in blip_configs:
        if ring_idx >= len(ring_radii):
            continue
        radius = ring_radii[ring_idx]
        angle_rad = math.radians(angle_deg)
        bx = RING_CENTER_X + radius * math.cos(angle_rad)
        by = RING_CENTER_Y + radius * math.sin(angle_rad)
        # Only draw blips that fall within the visible canvas area
        if -10 <= bx <= IMG_WIDTH + 10 and -10 <= by <= IMG_HEIGHT + 10:
            # Blip opacity matches its ring
            blip_opacity = max(60, int(220 - ring_idx * 25))
            blip_color = (229, 255, 0, blip_opacity)
            _draw_data_blip(draw, bx, by, blip_color, size=blip_size, glow=glow)

    # --- Additional tiny scattered dots (noise / ambient data) ---
    for _ in range(30):
        dx = rng.randint(int(IMG_WIDTH * 0.45), IMG_WIDTH)
        dy = rng.randint(0, IMG_HEIGHT)
        dot_alpha = rng.randint(15, 50)
        dot_size = rng.uniform(0.5, 1.5)
        draw.ellipse(
            [dx - dot_size, dy - dot_size, dx + dot_size, dy + dot_size],
            fill=(229, 255, 0, dot_alpha),
        )

    # --- Sweep line (radar beam) ---
    sweep_angle = math.radians(165)  # Points into the visible area
    sweep_end_x = RING_CENTER_X + 800 * math.cos(sweep_angle)
    sweep_end_y = RING_CENTER_Y + 800 * math.sin(sweep_angle)

    # Draw sweep line with gradient opacity (multiple overlapping lines)
    for offset in range(-2, 3):
        offset_angle = sweep_angle + math.radians(offset * 0.4)
        sx = RING_CENTER_X + 800 * math.cos(offset_angle)
        sy = RING_CENTER_Y + 800 * math.sin(offset_angle)
        line_alpha = max(5, 30 - abs(offset) * 10)
        draw.line(
            [(RING_CENTER_X, RING_CENTER_Y), (sx, sy)],
            fill=(229, 255, 0, line_alpha),
            width=1,
        )

    # --- Sweep glow cone (triangular gradient behind the sweep line) ---
    cone_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    cone_draw = ImageDraw.Draw(cone_layer, "RGBA")
    cone_spread = 15  # degrees
    for d in range(-cone_spread, 1):
        a = sweep_angle + math.radians(d)
        ex = RING_CENTER_X + 800 * math.cos(a)
        ey = RING_CENTER_Y + 800 * math.sin(a)
        alpha = max(1, int(12 * (1 - abs(d) / cone_spread)))
        cone_draw.line(
            [(RING_CENTER_X, RING_CENTER_Y), (ex, ey)],
            fill=(229, 255, 0, alpha),
            width=1,
        )
    img = Image.alpha_composite(img, cone_layer)
    draw = ImageDraw.Draw(img, "RGBA")

    # --- Subtle horizontal scan lines for texture ---
    for y in range(0, IMG_HEIGHT, 4):
        draw.line(
            [(0, y), (IMG_WIDTH, y)],
            fill=(0, 0, 0, 12),
            width=1,
        )

    # --- Text Elements ---

    # Load fonts
    title_font = _load_font(FONT_BOLD, 52)
    tag_font = _load_font(FONT_REGULAR, 18)
    brand_font = _load_font(FONT_BOLD, 22)
    brand_url_font = _load_font(FONT_REGULAR, 16)

    # --- Tag pill (top-left) ---
    tag_text = tag.upper()
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    pill_x = 60
    pill_y = 60
    pill_pad_x = 14
    pill_pad_y = 7

    draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pill_pad_x * 2, pill_y + tag_h + pill_pad_y * 2),
        ],
        radius=6,
        fill=(*ACCENT_COLOR, 255),
    )
    draw.text(
        (pill_x + pill_pad_x, pill_y + pill_pad_y),
        tag_text,
        fill=(*BG_COLOR, 255),
        font=tag_font,
    )

    # --- Title text (left side, vertically centered-ish) ---
    max_text_width = 560  # Keep title on the left ~half of the image
    wrapped = textwrap.fill(title, width=22)
    lines = wrapped.split("\n")[:3]  # Max 3 lines
    wrapped = "\n".join(lines)

    # Calculate vertical position to center the title block
    text_bbox = draw.multiline_textbbox((0, 0), wrapped, font=title_font, spacing=14)
    text_block_height = text_bbox[3] - text_bbox[1]
    title_y = max(130, (IMG_HEIGHT - text_block_height) // 2 - 20)

    # Draw text shadow for depth
    shadow_offset = 2
    draw.multiline_text(
        (60 + shadow_offset, title_y + shadow_offset),
        wrapped,
        fill=(0, 0, 0, 120),
        font=title_font,
        spacing=14,
    )
    # Draw main title text
    draw.multiline_text(
        (60, title_y),
        wrapped,
        fill=(*TEXT_COLOR, 255),
        font=title_font,
        spacing=14,
    )

    # --- TendHunt branding (bottom-left) ---
    brand_y = IMG_HEIGHT - 60
    draw.text(
        (60, brand_y),
        "TendHunt",
        fill=(*ACCENT_COLOR, 255),
        font=brand_font,
    )

    brand_bbox = draw.textbbox((60, brand_y), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 12

    # Separator dot
    dot_cx = url_x + 4
    dot_cy = brand_y + (brand_bbox[3] - brand_bbox[1]) // 2
    draw.ellipse(
        [dot_cx - 2, dot_cy - 2, dot_cx + 2, dot_cy + 2],
        fill=(*SECONDARY_TEXT, 180),
    )

    draw.text(
        (dot_cx + 10, brand_y + 3),
        "tendhunt.com/blog",
        fill=(*SECONDARY_TEXT, 200),
        font=brand_url_font,
    )

    # --- Thin accent line along the bottom edge ---
    draw.rectangle(
        [(0, IMG_HEIGHT - 3), (IMG_WIDTH, IMG_HEIGHT)],
        fill=(*ACCENT_COLOR, 60),
    )

    # Convert to RGB for PNG export (drop alpha channel)
    final = img.convert("RGB")

    # Save
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(str(output), "PNG", optimize=True)
    print(f"  Saved: {output}")


if __name__ == "__main__":
    test_title = "How to Find UK Government Tenders in 2026"
    test_tag = "UK Procurement"
    output_file = str(THUMBNAILS_DIR / "test_style_08.png")

    print(f"Generating Style 08 (Concentric Rings / Radar) thumbnail...")
    print(f"  Title: {test_title}")
    print(f"  Tag:   {test_tag}")
    generate_concentric_thumbnail(test_title, test_tag, output_file)
    print(f"Done.")
