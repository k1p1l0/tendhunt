"""Style 09: Abstract Wire Mesh / Topography thumbnail generator.

Creates a 1200x630 PNG with flowing topographic contour lines in lime (#E5FF00)
over a dark background, producing a premium abstract landscape feel.

Usage:
    python style_09_mesh.py
    python -m thumbnail_styles.style_09_mesh
"""

import math
import random
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)              # #0A0A0A
ACCENT_COLOR = (229, 255, 0)         # #E5FF00  (lime)
TEXT_COLOR = (255, 255, 255)          # White
SECONDARY_TEXT = (161, 161, 161)      # #A1A1A1

# Directories (relative to this file)
_THIS_DIR = Path(__file__).resolve().parent
FONTS_DIR = _THIS_DIR.parent / "fonts"
THUMBNAILS_DIR = _THIS_DIR.parent / "thumbnails"

FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the built-in default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _blend_color(base_rgb: tuple, alpha: float) -> tuple:
    """Pre-multiply *base_rgb* against BG_COLOR at the given *alpha* (0-1).

    Pillow's basic ImageDraw does not support per-draw alpha, so we
    manually compute the composited RGB for each opacity level.
    """
    return tuple(
        int(b * (1 - alpha) + c * alpha)
        for b, c in zip(BG_COLOR, base_rgb)
    )


# ---------------------------------------------------------------------------
# Contour / mesh generation
# ---------------------------------------------------------------------------

def _generate_contour_lines(
    seed: int = 42,
    num_lines: int = 38,
    y_start: int = -20,
    y_end: int = 660,
) -> list[dict]:
    """Return a list of contour-line descriptors.

    Each descriptor is a dict with keys:
        y_base   - vertical centre of the sine wave
        amp      - amplitude in pixels
        freq     - frequency multiplier
        phase    - phase offset (radians)
        width    - stroke width (1, 1.5, 2, or 3)
        opacity  - float 0-1
    """
    rng = random.Random(seed)
    spacing = (y_end - y_start) / num_lines
    lines = []

    for i in range(num_lines):
        y_base = y_start + i * spacing

        # Primary sine parameters
        amp = rng.uniform(6, 28)
        freq = rng.uniform(0.004, 0.012)
        phase = rng.uniform(0, 2 * math.pi)

        # Secondary harmonic for organic irregularity
        amp2 = rng.uniform(2, 10)
        freq2 = rng.uniform(0.015, 0.035)
        phase2 = rng.uniform(0, 2 * math.pi)

        # Third micro-harmonic for subtle texture
        amp3 = rng.uniform(0.5, 3)
        freq3 = rng.uniform(0.04, 0.08)
        phase3 = rng.uniform(0, 2 * math.pi)

        # Stroke weight - most lines thin, a few thick
        weight_roll = rng.random()
        if weight_roll < 0.10:
            width = 3
        elif weight_roll < 0.25:
            width = 2
        elif weight_roll < 0.45:
            width = 1.5
        else:
            width = 1

        # Opacity - varies to create depth layers
        # Lines near the vertical centre are brighter; edges fade
        centre_dist = abs(y_base - IMG_HEIGHT * 0.45) / (IMG_HEIGHT * 0.55)
        base_opacity = max(0.08, 1.0 - centre_dist * 0.85)
        opacity = base_opacity * rng.uniform(0.25, 1.0)
        opacity = min(opacity, 0.92)

        lines.append({
            "y_base": y_base,
            "amp": amp,
            "freq": freq,
            "phase": phase,
            "amp2": amp2,
            "freq2": freq2,
            "phase2": phase2,
            "amp3": amp3,
            "freq3": freq3,
            "phase3": phase3,
            "width": width,
            "opacity": opacity,
        })

    return lines


def _draw_contour_line(draw: ImageDraw.ImageDraw, line: dict) -> None:
    """Render a single contour line onto *draw*."""
    step = 2  # pixels between sample points (smoother = smaller step)
    points = []

    for x in range(0, IMG_WIDTH + step, step):
        y = (
            line["y_base"]
            + line["amp"]  * math.sin(line["freq"]  * x + line["phase"])
            + line["amp2"] * math.sin(line["freq2"] * x + line["phase2"])
            + line["amp3"] * math.sin(line["freq3"] * x + line["phase3"])
        )
        points.append((x, y))

    if len(points) < 2:
        return

    color = _blend_color(ACCENT_COLOR, line["opacity"])
    width = max(1, round(line["width"]))
    draw.line(points, fill=color, width=width, joint="curve")


def _draw_mesh_background(draw: ImageDraw.ImageDraw, seed: int = 42) -> None:
    """Draw the full set of topographic contour lines."""
    lines = _generate_contour_lines(seed=seed)
    # Sort by opacity so dimmer lines go first (painter's order)
    lines.sort(key=lambda l: l["opacity"])
    for line in lines:
        _draw_contour_line(draw, line)


# ---------------------------------------------------------------------------
# Glow effect for emphasis lines
# ---------------------------------------------------------------------------

def _draw_glow_lines(img: Image.Image, seed: int = 42) -> None:
    """Add a soft glow pass for the brightest contour lines.

    We render a second set of the highest-opacity lines onto a separate
    layer with a slight Gaussian blur, then composite it over the base.
    Two passes: a wide soft glow and a tighter bright halo.
    """
    try:
        from PIL import ImageFilter
    except ImportError:
        return  # Graceful degradation if filter unavailable

    lines = _generate_contour_lines(seed=seed)
    bright_lines = [l for l in lines if l["opacity"] > 0.45]

    def _compute_points(line: dict, step: int = 3) -> list[tuple]:
        pts = []
        for x in range(0, IMG_WIDTH + step, step):
            y = (
                line["y_base"]
                + line["amp"]  * math.sin(line["freq"]  * x + line["phase"])
                + line["amp2"] * math.sin(line["freq2"] * x + line["phase2"])
                + line["amp3"] * math.sin(line["freq3"] * x + line["phase3"])
            )
            pts.append((x, y))
        return pts

    # Pass 1: wide soft glow (large blur radius)
    glow_wide = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    glow_wide_draw = ImageDraw.Draw(glow_wide)
    for line in bright_lines:
        points = _compute_points(line)
        if len(points) < 2:
            continue
        glow_alpha = int(line["opacity"] * 45)
        glow_color = (*ACCENT_COLOR, glow_alpha)
        glow_wide_draw.line(points, fill=glow_color, width=max(8, round(line["width"] * 5)), joint="curve")
    glow_wide = glow_wide.filter(ImageFilter.GaussianBlur(radius=12))

    # Pass 2: tight bright halo
    glow_tight = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    glow_tight_draw = ImageDraw.Draw(glow_tight)
    for line in bright_lines:
        points = _compute_points(line)
        if len(points) < 2:
            continue
        glow_alpha = int(line["opacity"] * 70)
        glow_color = (*ACCENT_COLOR, glow_alpha)
        glow_tight_draw.line(points, fill=glow_color, width=max(4, round(line["width"] * 2)), joint="curve")
    glow_tight = glow_tight.filter(ImageFilter.GaussianBlur(radius=4))

    # Composite both glow layers onto the base
    base_rgba = img.convert("RGBA")
    composited = Image.alpha_composite(base_rgba, glow_wide)
    composited = Image.alpha_composite(composited, glow_tight)
    img.paste(composited.convert("RGB"))


# ---------------------------------------------------------------------------
# Text layout
# ---------------------------------------------------------------------------

def _draw_text_backdrop(img: Image.Image, y_top: int) -> None:
    """Draw a smooth dark gradient from *y_top* to the image bottom.

    This ensures the title and branding text remain legible regardless
    of what contour lines are underneath.
    """
    from PIL import ImageFilter

    overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    gradient_height = IMG_HEIGHT - y_top
    for i in range(gradient_height):
        y = y_top + i
        # Ease-in curve: starts transparent, builds to ~75% opacity at bottom
        t = i / max(gradient_height - 1, 1)
        alpha = int(200 * (t ** 1.6))
        alpha = min(alpha, 200)
        overlay_draw.line([(0, y), (IMG_WIDTH, y)], fill=(10, 10, 10, alpha))

    # Slight blur to soften the gradient bands
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=2))

    base_rgba = img.convert("RGBA")
    composited = Image.alpha_composite(base_rgba, overlay)
    img.paste(composited.convert("RGB"))


def _draw_text_overlay(img: Image.Image, draw: ImageDraw.ImageDraw, title: str, tag: str) -> None:
    """Render the tag pill, title text, and TendHunt branding."""
    # -- Fonts --
    title_font = _load_font(FONT_BOLD, 52)
    tag_font = _load_font(FONT_REGULAR, 18)
    brand_font = _load_font(FONT_BOLD, 22)
    url_font = _load_font(FONT_REGULAR, 16)

    # -- Tag pill (top-left) --
    tag_text = tag.upper()
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    pill_x = 60
    pill_y = 48
    pad_x = 16
    pad_y = 8

    draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pad_x * 2, pill_y + tag_h + pad_y * 2),
        ],
        radius=6,
        fill=ACCENT_COLOR,
    )
    draw.text(
        (pill_x + pad_x, pill_y + pad_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # -- Title (lower-left with generous breathing room) --
    max_chars_per_line = 26
    wrapped = textwrap.fill(title, width=max_chars_per_line)
    lines = wrapped.split("\n")[:3]  # Max 3 lines

    # Calculate total text block height to position from bottom
    line_spacing = 14
    single_bbox = draw.textbbox((0, 0), "Ag", font=title_font)
    line_h = single_bbox[3] - single_bbox[1]
    block_height = len(lines) * line_h + (len(lines) - 1) * line_spacing

    # Position: bottom-left, 110px above the brand bar
    text_x = 60
    text_y = IMG_HEIGHT - 110 - block_height

    # Draw a dark gradient backdrop behind the text zone for legibility
    _draw_text_backdrop(img, y_top=text_y - 50)
    # Re-acquire draw handle after image paste
    draw = ImageDraw.Draw(img)

    # Render each line with a subtle shadow for crispness
    for idx, line_text in enumerate(lines):
        y = text_y + idx * (line_h + line_spacing)
        # Shadow pass (offset down-right)
        draw.text((text_x + 2, y + 2), line_text, fill=(0, 0, 0), font=title_font)
        # Main white text
        draw.text((text_x, y), line_text, fill=TEXT_COLOR, font=title_font)

    # -- TendHunt branding (bottom-left) --
    brand_y = IMG_HEIGHT - 52
    draw.text((60, brand_y), "TendHunt", fill=ACCENT_COLOR, font=brand_font)

    brand_bbox = draw.textbbox((60, brand_y), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 14
    draw.text((url_x, brand_y + 3), "tendhunt.com/blog", fill=SECONDARY_TEXT, font=url_font)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate(
    title: str,
    tag: str,
    output_path: str | Path,
    seed: int = 42,
) -> Path:
    """Generate a Style 09 (wire mesh / topography) thumbnail.

    Args:
        title:       Article title to display.
        tag:         Primary tag shown in the accent pill.
        output_path: Destination file path for the PNG.
        seed:        RNG seed for reproducible contour patterns.

    Returns:
        Resolved Path to the saved PNG.
    """
    output = Path(output_path).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    # --- Base canvas ---
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # --- Topographic contour mesh ---
    _draw_mesh_background(draw, seed=seed)

    # --- Glow pass for bright lines ---
    _draw_glow_lines(img, seed=seed)

    # --- Re-acquire draw handle after paste ---
    draw = ImageDraw.Draw(img)

    # --- Text overlay (also composites a dark gradient backdrop) ---
    _draw_text_overlay(img, draw, title, tag)

    # --- Save ---
    img.save(str(output), "PNG", optimize=True)
    print(f"  [style_09_mesh] Saved: {output}  ({output.stat().st_size / 1024:.0f} KB)")
    return output


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_title = "How to Find UK Government Tenders in 2026"
    test_tag = "UK Procurement"
    out = THUMBNAILS_DIR / "test_style_09.png"

    print(f"Generating Style 09 (Wire Mesh / Topography) thumbnail...")
    print(f"  Title: {test_title}")
    print(f"  Tag:   {test_tag}")
    generate(test_title, test_tag, out)
    print("Done.")
