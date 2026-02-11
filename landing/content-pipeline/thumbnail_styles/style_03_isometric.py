"""Style 03: Isometric 3D Blocks thumbnail generator.

Creates a 1200x630 blog thumbnail with isometric 3D block/cube shapes
arranged in a rising bar-chart pattern. Dark background with lime accent
cubes, dotted grid lines for depth, and bold title text.

Visual metaphor: growth, data analysis, rising procurement opportunities.

Usage:
    python style_03_isometric.py
    python -m thumbnail_styles.style_03_isometric
"""

import math
import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR / ".." / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR / ".." / "thumbnails"

FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
BG_COLOR = (10, 10, 10)               # #0A0A0A
ACCENT_LIME = (229, 255, 0)           # #E5FF00
DARK_LIME = (139, 153, 0)             # #8B9900
DEEP_LIME = (80, 90, 0)              # deeper shade for cube sides
TEXT_WHITE = (255, 255, 255)           # #FFFFFF
SECONDARY_TEXT = (161, 161, 161)       # #A1A1A1
GRID_DOT_COLOR = (40, 45, 20)         # Subtle warm-tinted dots
CUBE_OUTLINE = (255, 255, 255, 60)    # Semi-transparent white edges
GLOW_LIME = (229, 255, 0, 30)         # Faint lime glow

# ---------------------------------------------------------------------------
# Canvas dimensions
# ---------------------------------------------------------------------------
IMG_WIDTH = 1200
IMG_HEIGHT = 630


# ---------------------------------------------------------------------------
# Font helpers
# ---------------------------------------------------------------------------
def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font with fallback to built-in default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


# ---------------------------------------------------------------------------
# Isometric math helpers
# ---------------------------------------------------------------------------
# Isometric projection angles: 30 degrees from horizontal
ISO_ANGLE = math.radians(30)
COS_A = math.cos(ISO_ANGLE)
SIN_A = math.sin(ISO_ANGLE)


def iso_project(x: float, y: float, z: float) -> tuple[float, float]:
    """Project 3D (x, y, z) coordinates to 2D isometric screen space.

    x = right axis, y = up axis, z = depth/left axis.
    Returns (screen_x, screen_y).
    """
    screen_x = (x - z) * COS_A
    screen_y = -(x + z) * SIN_A - y
    return screen_x, screen_y


def draw_isometric_cube(
    draw: ImageDraw.ImageDraw,
    origin_x: float,
    origin_y: float,
    size: float,
    height: float,
    top_color: tuple,
    right_color: tuple,
    left_color: tuple,
    outline_color: tuple = (255, 255, 255),
    outline_width: int = 1,
) -> None:
    """Draw a single isometric cube/block at the given screen origin.

    origin_x, origin_y: the bottom-center point of the cube base in screen coords.
    size: width of the cube base (isometric units).
    height: vertical height of the cube (isometric units).
    """
    s = size
    h = height

    # 8 corners of the cube in 3D, projected to 2D
    # Bottom face (y=0)
    b_front = iso_project(0, 0, 0)
    b_right = iso_project(s, 0, 0)
    b_back = iso_project(s, 0, s)
    b_left = iso_project(0, 0, s)

    # Top face (y=h)
    t_front = iso_project(0, h, 0)
    t_right = iso_project(s, h, 0)
    t_back = iso_project(s, h, s)
    t_left = iso_project(0, h, s)

    def offset(pt: tuple[float, float]) -> tuple[float, float]:
        return (pt[0] + origin_x, pt[1] + origin_y)

    # Draw faces as filled polygons (back-to-front: left, right, top)

    # Left face (facing left/back)
    left_face = [offset(b_front), offset(b_left), offset(t_left), offset(t_front)]
    draw.polygon(left_face, fill=left_color, outline=outline_color, width=outline_width)

    # Right face (facing right)
    right_face = [offset(b_front), offset(b_right), offset(t_right), offset(t_front)]
    draw.polygon(right_face, fill=right_color, outline=outline_color, width=outline_width)

    # Top face
    top_face = [offset(t_front), offset(t_right), offset(t_back), offset(t_left)]
    draw.polygon(top_face, fill=top_color, outline=outline_color, width=outline_width)


def draw_dotted_iso_grid(
    draw: ImageDraw.ImageDraw,
    origin_x: float,
    origin_y: float,
    grid_size: float,
    cols: int,
    rows: int,
    dot_color: tuple,
    dot_radius: int = 1,
) -> None:
    """Draw a dotted grid on the isometric ground plane for depth effect.

    The grid starts at origin and extends in the +x and +z directions.
    """
    for col in range(cols + 1):
        for row in range(rows + 1):
            px, py = iso_project(col * grid_size, 0, row * grid_size)
            sx = px + origin_x
            sy = py + origin_y
            # Only draw dots within canvas bounds (with margin)
            if -10 < sx < IMG_WIDTH + 10 and -10 < sy < IMG_HEIGHT + 10:
                draw.ellipse(
                    [
                        (sx - dot_radius, sy - dot_radius),
                        (sx + dot_radius, sy + dot_radius),
                    ],
                    fill=dot_color,
                )


def draw_dotted_iso_lines(
    draw: ImageDraw.ImageDraw,
    origin_x: float,
    origin_y: float,
    grid_size: float,
    cols: int,
    rows: int,
    line_color: tuple,
    dash_length: int = 3,
    gap_length: int = 6,
) -> None:
    """Draw dotted/dashed lines along the isometric grid for a subtle perspective effect."""
    # Lines along x-axis (for each z row)
    for row in range(rows + 1):
        points = []
        for col in range(cols + 1):
            px, py = iso_project(col * grid_size, 0, row * grid_size)
            points.append((px + origin_x, py + origin_y))

        _draw_dashed_polyline(draw, points, line_color, dash_length, gap_length)

    # Lines along z-axis (for each x col)
    for col in range(cols + 1):
        points = []
        for row in range(rows + 1):
            px, py = iso_project(col * grid_size, 0, row * grid_size)
            points.append((px + origin_x, py + origin_y))

        _draw_dashed_polyline(draw, points, line_color, dash_length, gap_length)


def _draw_dashed_polyline(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    color: tuple,
    dash: int = 3,
    gap: int = 6,
) -> None:
    """Draw a dashed/dotted polyline through a list of points."""
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        length = math.hypot(x1 - x0, y1 - y0)
        if length < 1:
            continue
        dx = (x1 - x0) / length
        dy = (y1 - y0) / length
        pos = 0.0
        drawing = True
        while pos < length:
            seg = dash if drawing else gap
            end = min(pos + seg, length)
            if drawing:
                sx = x0 + dx * pos
                sy = y0 + dy * pos
                ex = x0 + dx * end
                ey = y0 + dy * end
                draw.line([(sx, sy), (ex, ey)], fill=color, width=1)
            pos = end
            drawing = not drawing


# ---------------------------------------------------------------------------
# Ambient glow / atmosphere
# ---------------------------------------------------------------------------
def draw_glow_spot(
    img: Image.Image,
    center_x: int,
    center_y: int,
    radius: int,
    color: tuple,
    intensity: int = 15,
) -> None:
    """Draw a soft radial glow on the image using alpha compositing."""
    glow = Image.new("RGBA", (radius * 2, radius * 2), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for r in range(radius, 0, -2):
        alpha = int(intensity * (r / radius))
        glow_draw.ellipse(
            [(radius - r, radius - r), (radius + r, radius + r)],
            fill=(color[0], color[1], color[2], alpha),
        )
    # Paste glow onto image
    img_rgba = img.convert("RGBA")
    img_rgba.paste(glow, (center_x - radius, center_y - radius), glow)
    img.paste(img_rgba.convert("RGB"))


# ---------------------------------------------------------------------------
# Floating particles
# ---------------------------------------------------------------------------
def draw_particles(
    draw: ImageDraw.ImageDraw,
    region_x: int,
    region_y: int,
    region_w: int,
    region_h: int,
    count: int = 30,
    color: tuple = (229, 255, 0),
    seed: int = 42,
) -> None:
    """Draw small scattered particles/dots for visual texture."""
    rng = random.Random(seed)
    for _ in range(count):
        px = rng.randint(region_x, region_x + region_w)
        py = rng.randint(region_y, region_y + region_h)
        r = rng.choice([1, 1, 1, 2])
        alpha = rng.randint(30, 90)
        particle_color = (color[0], color[1], color[2], alpha)
        # Approximate alpha by blending with background
        blend = alpha / 255
        blended = tuple(
            int(c * blend + 10 * (1 - blend)) for c in color[:3]
        )
        draw.ellipse(
            [(px - r, py - r), (px + r, py + r)],
            fill=blended,
        )


# ---------------------------------------------------------------------------
# Main generation function
# ---------------------------------------------------------------------------
def generate_isometric_thumbnail(
    title: str,
    tag: str,
    output_path: str,
) -> None:
    """Generate a TendHunt blog thumbnail with isometric 3D block style.

    Args:
        title: Article title to display on the left side.
        tag: Primary tag shown in the accent pill (top-left).
        output_path: File path to save the PNG.
    """
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # ------------------------------------------------------------------
    # 1. Ambient glow behind the cube area (right side)
    # ------------------------------------------------------------------
    draw_glow_spot(img, center_x=920, center_y=420, radius=320, color=ACCENT_LIME, intensity=12)
    draw_glow_spot(img, center_x=1050, center_y=350, radius=200, color=ACCENT_LIME, intensity=8)
    # Reinitialize draw after glow compositing
    draw = ImageDraw.Draw(img)

    # ------------------------------------------------------------------
    # 2. Dotted isometric grid (ground plane, right side)
    # ------------------------------------------------------------------
    grid_origin_x = 680
    grid_origin_y = 560
    grid_cell = 40

    draw_dotted_iso_lines(
        draw,
        origin_x=grid_origin_x,
        origin_y=grid_origin_y,
        grid_size=grid_cell,
        cols=14,
        rows=10,
        line_color=(35, 40, 20),
        dash_length=2,
        gap_length=8,
    )

    draw_dotted_iso_grid(
        draw,
        origin_x=grid_origin_x,
        origin_y=grid_origin_y,
        grid_size=grid_cell,
        cols=14,
        rows=10,
        dot_color=GRID_DOT_COLOR,
        dot_radius=1,
    )

    # ------------------------------------------------------------------
    # 3. Isometric 3D blocks -- rising bar chart pattern
    # ------------------------------------------------------------------
    # Bar heights represent a growth pattern (like a trending-up chart)
    bar_heights = [80, 120, 100, 160, 140, 200, 180, 250, 220, 300]
    cube_size = 36
    spacing = 44  # horizontal spacing between bar centers in iso units

    # Position bars from left to right on the isometric ground plane
    bars_base_x = 700
    bars_base_y = 530

    for i, h in enumerate(bar_heights):
        # Each bar's ground position in isometric space
        iso_x = i * spacing
        iso_z = 0  # All bars on the same z-row

        # Project the base point to screen
        sx, sy = iso_project(iso_x, 0, iso_z)
        screen_x = sx + bars_base_x
        screen_y = sy + bars_base_y

        # Alternate colors for visual variety
        if i % 3 == 0:
            top = ACCENT_LIME
            right = DARK_LIME
            left = DEEP_LIME
            outline = (255, 255, 255)
        elif i % 3 == 1:
            top = (200, 225, 0)
            right = (120, 135, 0)
            left = (70, 80, 0)
            outline = (200, 220, 180)
        else:
            top = (180, 205, 0)
            right = (100, 115, 0)
            left = (60, 70, 0)
            outline = (180, 200, 160)

        draw_isometric_cube(
            draw,
            origin_x=screen_x,
            origin_y=screen_y,
            size=cube_size,
            height=h,
            top_color=top,
            right_color=right,
            left_color=left,
            outline_color=outline,
            outline_width=1,
        )

    # ------------------------------------------------------------------
    # 4. Add a second row of smaller cubes behind (depth)
    # ------------------------------------------------------------------
    back_row_heights = [50, 70, 60, 90, 80, 110, 100, 130]
    small_cube = 28
    back_spacing = 44

    for i, h in enumerate(back_row_heights):
        iso_x = i * back_spacing + 20
        iso_z = 60  # Further back in z

        sx, sy = iso_project(iso_x, 0, iso_z)
        screen_x = sx + bars_base_x
        screen_y = sy + bars_base_y

        # Dimmer colors for back row
        top = (160, 180, 0)
        right = (90, 100, 0)
        left = (50, 58, 0)
        outline = (120, 140, 100)

        draw_isometric_cube(
            draw,
            origin_x=screen_x,
            origin_y=screen_y,
            size=small_cube,
            height=h,
            top_color=top,
            right_color=right,
            left_color=left,
            outline_color=outline,
            outline_width=1,
        )

    # ------------------------------------------------------------------
    # 5. Floating particles around the cubes
    # ------------------------------------------------------------------
    draw_particles(draw, 650, 80, 500, 500, count=40, color=ACCENT_LIME, seed=42)

    # ------------------------------------------------------------------
    # 6. Vertical accent line separator
    # ------------------------------------------------------------------
    separator_x = 580
    draw.line(
        [(separator_x, 60), (separator_x, IMG_HEIGHT - 60)],
        fill=(50, 55, 30),
        width=1,
    )
    # Small lime diamond on the separator
    diamond_y = IMG_HEIGHT // 2
    diamond_size = 5
    draw.polygon(
        [
            (separator_x, diamond_y - diamond_size),
            (separator_x + diamond_size, diamond_y),
            (separator_x, diamond_y + diamond_size),
            (separator_x - diamond_size, diamond_y),
        ],
        fill=ACCENT_LIME,
    )

    # ------------------------------------------------------------------
    # 7. Tag pill (top-left)
    # ------------------------------------------------------------------
    tag_font = _load_font(FONT_REGULAR, 18)
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
        radius=4,
        fill=ACCENT_LIME,
    )
    draw.text(
        (pill_x + pill_pad_x, pill_y + pill_pad_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # ------------------------------------------------------------------
    # 8. Title text (left side, bold, large)
    # ------------------------------------------------------------------
    title_font = _load_font(FONT_BOLD, 54)
    # Wrap to fit the left column (~520px wide)
    wrapped = textwrap.fill(title, width=20)
    lines = wrapped.split("\n")[:4]  # Max 4 lines
    title_block = "\n".join(lines)

    # Measure title block height for vertical centering
    temp_bbox = draw.multiline_textbbox((0, 0), title_block, font=title_font, spacing=14)
    title_block_h = temp_bbox[3] - temp_bbox[1]

    # Vertical center between pill bottom and branding top
    title_y_start = max(120, (IMG_HEIGHT - title_block_h) // 2 - 20)

    draw.multiline_text(
        (60, title_y_start),
        title_block,
        fill=TEXT_WHITE,
        font=title_font,
        spacing=14,
    )

    # ------------------------------------------------------------------
    # 9. TendHunt branding (bottom-left)
    # ------------------------------------------------------------------
    brand_font = _load_font(FONT_BOLD, 22)
    url_font = _load_font(FONT_REGULAR, 16)

    brand_y = IMG_HEIGHT - 65
    draw.text((60, brand_y), "TendHunt", fill=ACCENT_LIME, font=brand_font)

    brand_bbox = draw.textbbox((60, brand_y), "TendHunt", font=brand_font)
    # Small lime dot between brand and URL
    dot_x = brand_bbox[2] + 10
    dot_y = brand_y + (brand_bbox[3] - brand_bbox[1]) // 2
    draw.ellipse(
        [(dot_x - 2, dot_y - 2), (dot_x + 2, dot_y + 2)],
        fill=ACCENT_LIME,
    )
    draw.text(
        (dot_x + 10, brand_y + 3),
        "tendhunt.com/blog",
        fill=SECONDARY_TEXT,
        font=url_font,
    )

    # ------------------------------------------------------------------
    # 10. Thin accent bar at the very top
    # ------------------------------------------------------------------
    draw.rectangle([(0, 0), (IMG_WIDTH, 4)], fill=ACCENT_LIME)

    # ------------------------------------------------------------------
    # Save
    # ------------------------------------------------------------------
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output), "PNG", optimize=True)
    print(f"[style_03_isometric] Saved: {output}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    test_title = "How to Find UK Government Tenders in 2026"
    test_tag = "UK Procurement"
    test_output = str(THUMBNAILS_DIR / "test_style_03.png")

    print(f"Generating isometric thumbnail...")
    print(f"  Title: {test_title}")
    print(f"  Tag:   {test_tag}")
    print(f"  Output: {test_output}")

    generate_isometric_thumbnail(test_title, test_tag, test_output)
    print("Done.")
