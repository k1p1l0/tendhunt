"""Style 04: Neon Glow / Cyberpunk thumbnail generator.

Creates dramatic 1200x630 blog thumbnails with neon circuit/network patterns,
bloom glow effects, and a cyberpunk aesthetic. Uses Pillow + ImageFilter for
the multi-layer glow compositing.

Usage:
    python style_04_neon_glow.py
    python style_04_neon_glow.py "Custom Title" "Custom Tag" output.png
"""

import math
import random
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)               # #0A0A0A
LIME = (229, 255, 0)                   # #E5FF00  -- primary glow
CYAN = (0, 212, 255)                   # #00D4FF  -- secondary glow
WHITE = (255, 255, 255)
DIM_WHITE = (200, 200, 200)

# Font paths (relative to this file -- ../fonts/)
SCRIPT_DIR = Path(__file__).resolve().parent
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR.parent / "thumbnails"
FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# Reproducible randomness for consistent test output
SEED = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the Pillow default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _rgba(rgb: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
    """Append an alpha channel to an RGB tuple."""
    return (*rgb, alpha)


# ---------------------------------------------------------------------------
# Circuit / network pattern generation
# ---------------------------------------------------------------------------

def _generate_nodes(rng: random.Random, count: int = 50) -> list[tuple[int, int]]:
    """Create a set of random node positions across the canvas.

    Nodes are distributed with slight bias toward the right half of the image
    so the visual weight balances against the left-aligned title text.
    """
    nodes: list[tuple[int, int]] = []
    for _ in range(count):
        # 60 % of nodes in the right two-thirds, 40 % anywhere
        if rng.random() < 0.6:
            x = rng.randint(IMG_WIDTH // 3, IMG_WIDTH + 60)
        else:
            x = rng.randint(-60, IMG_WIDTH + 60)
        y = rng.randint(-60, IMG_HEIGHT + 60)
        nodes.append((x, y))
    return nodes


def _generate_edges(
    rng: random.Random,
    nodes: list[tuple[int, int]],
    max_distance: float = 260.0,
    connection_probability: float = 0.35,
) -> list[tuple[int, int]]:
    """Build edges between nearby nodes, forming a network graph.

    Returns a flat list of (node_index_a, node_index_b) tuples.
    """
    edges: list[tuple[int, int]] = []
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            dx = nodes[i][0] - nodes[j][0]
            dy = nodes[i][1] - nodes[j][1]
            dist = math.hypot(dx, dy)
            if dist < max_distance and rng.random() < connection_probability:
                edges.append((i, j))
    return edges


def _draw_circuit_lines(
    draw: ImageDraw.ImageDraw,
    nodes: list[tuple[int, int]],
    edges: list[tuple[int, int]],
    rng: random.Random,
) -> None:
    """Draw the sharp (pre-glow) circuit lines on the layer.

    Lines alternate between lime and cyan, with varying widths to create a
    sense of depth. Some lines are drawn as right-angle segments (L-shaped)
    to mimic PCB traces.
    """
    for idx_a, idx_b in edges:
        ax, ay = nodes[idx_a]
        bx, by = nodes[idx_b]

        # Choose color -- 65 % lime, 35 % cyan
        color = LIME if rng.random() < 0.65 else CYAN
        alpha = rng.randint(100, 220)
        line_color = _rgba(color, alpha)
        width = rng.choice([1, 1, 2, 2, 3])

        # 40 % of lines use an L-shaped (right-angle) path for a circuit look
        if rng.random() < 0.40:
            mid_x = ax if rng.random() < 0.5 else bx
            mid_y = by if mid_x == ax else ay
            draw.line([(ax, ay), (mid_x, mid_y)], fill=line_color, width=width)
            draw.line([(mid_x, mid_y), (bx, by)], fill=line_color, width=width)
        else:
            draw.line([(ax, ay), (bx, by)], fill=line_color, width=width)


def _draw_nodes(
    draw: ImageDraw.ImageDraw,
    nodes: list[tuple[int, int]],
    rng: random.Random,
) -> None:
    """Draw glowing dots at node positions.

    Nodes vary in size and color. Some get a larger outer halo to act as
    prominent intersections.
    """
    for x, y in nodes:
        color = LIME if rng.random() < 0.6 else CYAN
        base_radius = rng.choice([2, 3, 3, 4])
        alpha = rng.randint(140, 255)
        dot_color = _rgba(color, alpha)

        # Outer halo for ~30 % of nodes
        if rng.random() < 0.30:
            halo_r = base_radius + rng.randint(5, 10)
            halo_color = _rgba(color, 55)
            draw.ellipse(
                [(x - halo_r, y - halo_r), (x + halo_r, y + halo_r)],
                fill=halo_color,
            )

        # Core dot
        draw.ellipse(
            [(x - base_radius, y - base_radius), (x + base_radius, y + base_radius)],
            fill=dot_color,
        )


def _draw_horizontal_scan_lines(
    draw: ImageDraw.ImageDraw,
    rng: random.Random,
    count: int = 6,
) -> None:
    """Draw faint horizontal accent lines spanning the full width.

    These add a subtle CRT / scan-line feel to the background.
    """
    for _ in range(count):
        y = rng.randint(0, IMG_HEIGHT)
        color = _rgba(LIME if rng.random() < 0.5 else CYAN, rng.randint(8, 25))
        draw.line([(0, y), (IMG_WIDTH, y)], fill=color, width=1)


def _draw_corner_brackets(draw: ImageDraw.ImageDraw) -> None:
    """Draw small tech-style corner brackets at the image edges.

    These are decorative UI elements that reinforce the cyberpunk aesthetic.
    """
    bracket_len = 30
    bracket_width = 2
    margin = 20
    color = _rgba(LIME, 100)

    # Top-left
    draw.line([(margin, margin), (margin + bracket_len, margin)], fill=color, width=bracket_width)
    draw.line([(margin, margin), (margin, margin + bracket_len)], fill=color, width=bracket_width)

    # Top-right
    draw.line([(IMG_WIDTH - margin, margin), (IMG_WIDTH - margin - bracket_len, margin)], fill=color, width=bracket_width)
    draw.line([(IMG_WIDTH - margin, margin), (IMG_WIDTH - margin, margin + bracket_len)], fill=color, width=bracket_width)

    # Bottom-left
    draw.line([(margin, IMG_HEIGHT - margin), (margin + bracket_len, IMG_HEIGHT - margin)], fill=color, width=bracket_width)
    draw.line([(margin, IMG_HEIGHT - margin), (margin, IMG_HEIGHT - margin - bracket_len)], fill=color, width=bracket_width)

    # Bottom-right
    draw.line([(IMG_WIDTH - margin, IMG_HEIGHT - margin), (IMG_WIDTH - margin - bracket_len, IMG_HEIGHT - margin)], fill=color, width=bracket_width)
    draw.line([(IMG_WIDTH - margin, IMG_HEIGHT - margin), (IMG_WIDTH - margin, IMG_HEIGHT - margin - bracket_len)], fill=color, width=bracket_width)


# ---------------------------------------------------------------------------
# Glow compositing
# ---------------------------------------------------------------------------

def _create_glow_layer(sharp_layer: Image.Image, radius: int = 12) -> Image.Image:
    """Create a bloom / glow layer by blurring the sharp artwork.

    The sharp layer is blurred with a large Gaussian radius, then the result
    is brightened slightly so the glow is visible against the dark background.
    """
    glow = sharp_layer.copy()
    glow = glow.filter(ImageFilter.GaussianBlur(radius=radius))
    return glow


def _create_wide_glow_layer(sharp_layer: Image.Image, radius: int = 30) -> Image.Image:
    """Create a wider, softer ambient glow for extra bloom.

    This layer uses a much larger blur radius to create the distant,
    atmospheric glow that makes the neon feel luminous.
    """
    glow = sharp_layer.copy()
    glow = glow.filter(ImageFilter.GaussianBlur(radius=radius))
    return glow


# ---------------------------------------------------------------------------
# Vignette overlay
# ---------------------------------------------------------------------------

def _create_vignette(width: int, height: int, strength: float = 0.7) -> Image.Image:
    """Create a radial vignette as a black RGBA overlay.

    Returns an RGBA image where the center is fully transparent and the edges
    fade to semi-opaque black. Compositing this over the canvas darkens the
    edges, focusing visual attention on the center / text area.

    Computed at a small resolution then upscaled for performance. Pure Pillow
    implementation -- no numpy required.

    Args:
        width: Image width.
        height: Image height.
        strength: 0.0 = no vignette, 1.0 = full black corners.
    """
    # Compute at 1/8 resolution for speed, then upscale smoothly
    sw, sh = max(width // 8, 2), max(height // 8, 2)
    alpha_small = Image.new("L", (sw, sh), 0)
    pixels = alpha_small.load()

    cx = sw / 2.0
    cy = sh / 2.0
    max_dist = math.hypot(1.0, 1.0)

    for py in range(sh):
        ny = (py - cy) / cy
        for px in range(sw):
            nx = (px - cx) / cx
            dist = min(math.hypot(nx, ny) / max_dist, 1.0)
            a = strength * (dist ** 2.5)
            pixels[px, py] = int(min(a, 1.0) * 255)

    alpha = alpha_small.resize((width, height), Image.BILINEAR)

    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vignette.putalpha(alpha)
    return vignette


# ---------------------------------------------------------------------------
# Text rendering with glow
# ---------------------------------------------------------------------------

def _draw_text_with_glow(
    base: Image.Image,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    text_color: tuple[int, int, int],
    glow_color: tuple[int, int, int],
    glow_radius: int = 8,
    glow_intensity: int = 3,
) -> None:
    """Draw text with a neon glow halo behind it.

    Process:
    1. Render text on a transparent layer.
    2. Blur the text layer to create the glow.
    3. Composite the glow, then the sharp text on top.
    """
    # Create text-only layer
    text_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    text_draw.multiline_text(position, text, fill=_rgba(glow_color, 255), font=font, spacing=14)

    # Blur for glow -- stack multiple passes for intensity
    glow_layer = text_layer.copy()
    for _ in range(glow_intensity):
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=glow_radius))

    # Composite glow below text
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        glow_layer,
    ), (0, 0), glow_layer)

    # Draw crisp text on top
    sharp_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sharp_draw = ImageDraw.Draw(sharp_layer)
    sharp_draw.multiline_text(position, text, fill=_rgba(text_color, 255), font=font, spacing=14)
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        sharp_layer,
    ), (0, 0), sharp_layer)


def _draw_single_line_text_with_glow(
    base: Image.Image,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    text_color: tuple[int, int, int],
    glow_color: tuple[int, int, int],
    glow_radius: int = 6,
    glow_intensity: int = 2,
) -> None:
    """Same as _draw_text_with_glow but for single-line text."""
    text_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    text_draw = ImageDraw.Draw(text_layer)
    text_draw.text(position, text, fill=_rgba(glow_color, 255), font=font)

    glow_layer = text_layer.copy()
    for _ in range(glow_intensity):
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=glow_radius))

    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        glow_layer,
    ), (0, 0), glow_layer)

    sharp_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sharp_draw = ImageDraw.Draw(sharp_layer)
    sharp_draw.text(position, text, fill=_rgba(text_color, 255), font=font)
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        sharp_layer,
    ), (0, 0), sharp_layer)


# ---------------------------------------------------------------------------
# Tag pill with glow border
# ---------------------------------------------------------------------------

def _draw_tag_pill(
    base: Image.Image,
    position: tuple[int, int],
    tag_text: str,
    font: ImageFont.FreeTypeFont,
) -> None:
    """Draw a tag pill with a glowing neon border.

    The pill has a transparent/dark fill with a lime border that glows.
    """
    temp = ImageDraw.Draw(base)
    tag_upper = tag_text.upper()
    bbox = temp.textbbox((0, 0), tag_upper, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    px, py = 18, 10  # padding

    x, y = position
    pill_rect = [
        (x, y),
        (x + tw + px * 2, y + th + py * 2),
    ]

    # --- Glow border layer ---
    border_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_layer)
    # Draw a slightly thick rounded rect as the glow source
    border_draw.rounded_rectangle(pill_rect, radius=8, outline=_rgba(LIME, 255), width=3)

    glow = border_layer.copy()
    for _ in range(3):
        glow = glow.filter(ImageFilter.GaussianBlur(radius=6))

    # Composite glow
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        glow,
    ), (0, 0), glow)

    # --- Sharp border + fill ---
    pill_draw = ImageDraw.Draw(base)
    pill_draw.rounded_rectangle(pill_rect, radius=8, fill=_rgba(BG_COLOR, 200), outline=_rgba(LIME, 220), width=2)

    # --- Text ---
    pill_draw.text(
        (x + px, y + py),
        tag_upper,
        fill=_rgba(LIME, 255),
        font=font,
    )


# ---------------------------------------------------------------------------
# Branding
# ---------------------------------------------------------------------------

def _draw_branding(base: Image.Image) -> None:
    """Draw the TendHunt brand mark and URL at the bottom with subtle glow."""
    brand_font = _load_font(FONT_BOLD, 22)
    url_font = _load_font(FONT_REGULAR, 16)

    # Brand name with glow
    _draw_single_line_text_with_glow(
        base,
        position=(60, IMG_HEIGHT - 65),
        text="TendHunt",
        font=brand_font,
        text_color=LIME,
        glow_color=LIME,
        glow_radius=6,
        glow_intensity=2,
    )

    # Measure brand text to position URL
    measure = ImageDraw.Draw(base)
    brand_bbox = measure.textbbox((60, IMG_HEIGHT - 65), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 14

    _draw_single_line_text_with_glow(
        base,
        position=(url_x, IMG_HEIGHT - 61),
        text="tendhunt.com/blog",
        font=url_font,
        text_color=DIM_WHITE,
        glow_color=CYAN,
        glow_radius=4,
        glow_intensity=1,
    )

    # Small decorative glowing dot bottom-right
    dot_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    dot_cx, dot_cy = IMG_WIDTH - 70, IMG_HEIGHT - 50
    dot_r = 5
    dot_draw.ellipse(
        [(dot_cx - dot_r, dot_cy - dot_r), (dot_cx + dot_r, dot_cy + dot_r)],
        fill=_rgba(CYAN, 255),
    )

    # Glow for dot
    dot_glow = dot_layer.filter(ImageFilter.GaussianBlur(radius=10))
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        dot_glow,
    ), (0, 0), dot_glow)
    base.paste(Image.alpha_composite(
        Image.new("RGBA", base.size, (0, 0, 0, 0)),
        dot_layer,
    ), (0, 0), dot_layer)


# ---------------------------------------------------------------------------
# Main generation function
# ---------------------------------------------------------------------------

def generate_neon_glow_thumbnail(
    title: str,
    tag: str,
    output_path: str,
    seed: int = SEED,
) -> None:
    """Generate a Neon Glow / Cyberpunk style thumbnail.

    Args:
        title: Article title text.
        tag: Primary tag shown in the glowing pill.
        output_path: File path for the output PNG.
        seed: Random seed for reproducible pattern generation.
    """
    rng = random.Random(seed)

    # ------------------------------------------------------------------
    # 1. Dark background base (RGBA for compositing)
    # ------------------------------------------------------------------
    canvas = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), _rgba(BG_COLOR, 255))

    # ------------------------------------------------------------------
    # 2. Generate circuit network
    # ------------------------------------------------------------------
    nodes = _generate_nodes(rng, count=55)
    edges = _generate_edges(rng, nodes, max_distance=280, connection_probability=0.30)

    # ------------------------------------------------------------------
    # 3. Draw the sharp circuit artwork on a transparent layer
    # ------------------------------------------------------------------
    circuit_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    circuit_draw = ImageDraw.Draw(circuit_layer)

    _draw_circuit_lines(circuit_draw, nodes, edges, rng)
    _draw_nodes(circuit_draw, nodes, rng)
    _draw_horizontal_scan_lines(circuit_draw, rng, count=8)

    # ------------------------------------------------------------------
    # 4. Create glow layers (bloom effect)
    # ------------------------------------------------------------------
    glow_tight = _create_glow_layer(circuit_layer, radius=12)
    glow_wide = _create_wide_glow_layer(circuit_layer, radius=50)

    # ------------------------------------------------------------------
    # 5. Composite: wide glow -> tight glow -> sharp lines
    #    The wide glow creates the atmospheric bloom, tight glow adds
    #    the near-field luminosity, and the sharp layer sits on top.
    # ------------------------------------------------------------------
    canvas = Image.alpha_composite(canvas, glow_wide)
    canvas = Image.alpha_composite(canvas, glow_tight)
    canvas = Image.alpha_composite(canvas, glow_tight)   # second tight pass for punch
    canvas = Image.alpha_composite(canvas, circuit_layer)

    # ------------------------------------------------------------------
    # 6. Corner brackets (tech UI decoration)
    # ------------------------------------------------------------------
    bracket_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    bracket_draw = ImageDraw.Draw(bracket_layer)
    _draw_corner_brackets(bracket_draw)
    canvas = Image.alpha_composite(canvas, bracket_layer)

    # ------------------------------------------------------------------
    # 7. Apply vignette to darken edges and focus attention
    # ------------------------------------------------------------------
    vignette_overlay = _create_vignette(IMG_WIDTH, IMG_HEIGHT, strength=0.85)
    canvas = Image.alpha_composite(canvas, vignette_overlay)

    # ------------------------------------------------------------------
    # 8. Subtle top accent line (lime gradient fade)
    # ------------------------------------------------------------------
    accent_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent_layer)
    # Thin bright lime line across the top
    accent_draw.rectangle([(0, 0), (IMG_WIDTH, 3)], fill=_rgba(LIME, 180))
    # Glow it
    accent_glow = accent_layer.filter(ImageFilter.GaussianBlur(radius=6))
    canvas = Image.alpha_composite(canvas, accent_glow)
    canvas = Image.alpha_composite(canvas, accent_layer)

    # ------------------------------------------------------------------
    # 9. Tag pill
    # ------------------------------------------------------------------
    tag_font = _load_font(FONT_REGULAR, 18)
    _draw_tag_pill(canvas, position=(60, 75), tag_text=tag, font=tag_font)

    # ------------------------------------------------------------------
    # 10. Title text with glow
    # ------------------------------------------------------------------
    title_font = _load_font(FONT_BOLD, 54)
    wrapped = textwrap.fill(title, width=26)
    lines = wrapped.split("\n")[:3]
    wrapped = "\n".join(lines)

    _draw_text_with_glow(
        canvas,
        position=(60, 130),
        text=wrapped,
        font=title_font,
        text_color=WHITE,
        glow_color=LIME,
        glow_radius=14,
        glow_intensity=4,
    )

    # ------------------------------------------------------------------
    # 11. Branding
    # ------------------------------------------------------------------
    _draw_branding(canvas)

    # ------------------------------------------------------------------
    # 12. Final noise / grain overlay for texture (very subtle)
    # ------------------------------------------------------------------
    noise_layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    noise_pixels = noise_layer.load()
    for ny in range(0, IMG_HEIGHT, 2):
        for nx in range(0, IMG_WIDTH, 2):
            if rng.random() < 0.03:
                v = rng.randint(20, 50)
                noise_pixels[nx, ny] = (v, v, v, rng.randint(15, 40))
    canvas = Image.alpha_composite(canvas, noise_layer)

    # ------------------------------------------------------------------
    # 13. Save as optimized PNG
    # ------------------------------------------------------------------
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    # Flatten to RGB for final PNG
    final = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    final.paste(canvas, (0, 0), canvas)
    final.save(str(output), "PNG", optimize=True)
    print(f"  [style_04] Saved neon glow thumbnail: {output}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        gen_title = sys.argv[1]
        gen_tag = sys.argv[2]
        gen_output = sys.argv[3]
    else:
        gen_title = "How to Find UK Government Tenders in 2026"
        gen_tag = "UK Procurement"
        gen_output = str(THUMBNAILS_DIR / "test_style_04.png")

    print(f"Generating neon glow thumbnail...")
    print(f"  Title: {gen_title}")
    print(f"  Tag:   {gen_tag}")
    print(f"  Output: {gen_output}")
    generate_neon_glow_thumbnail(gen_title, gen_tag, gen_output)
    print("Done.")
