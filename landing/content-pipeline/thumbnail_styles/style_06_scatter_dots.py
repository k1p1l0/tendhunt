"""Style 06: Data Scatter / Particle Field thumbnail generator.

Creates a 1200x630 PNG blog thumbnail featuring hundreds of scattered
dots and particles connected by thin constellation lines. The particles
cluster more densely on the right side, leaving the left clear for title
text. Produces a data-visualization / analytics aesthetic.

Usage:
    python style_06_scatter_dots.py
    python style_06_scatter_dots.py "Custom Title" "Custom Tag" output.png
"""

import math
import random
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
BASE_DIR = SCRIPT_DIR.parent
FONTS_DIR = BASE_DIR / "fonts"
THUMBNAILS_DIR = BASE_DIR / "thumbnails"
FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
BG_COLOR = (10, 10, 10)             # #0A0A0A
ACCENT_LIME = (229, 255, 0)         # #E5FF00
TEAL = (20, 184, 166)               # #14B8A6
WHITE = (255, 255, 255)
SECONDARY_TEXT = (161, 161, 161)     # #A1A1A1

# Image dimensions (Open Graph standard)
IMG_WIDTH = 1200
IMG_HEIGHT = 630

# ---------------------------------------------------------------------------
# Particle generation parameters
# ---------------------------------------------------------------------------
PARTICLE_COUNT = 420
CONSTELLATION_MAX_DIST = 90          # max px between dots to draw a line
CONSTELLATION_LINE_COUNT = 60        # number of constellation edges
SEED = 42                            # fixed seed for reproducibility


def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the default bitmap font."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


# ---------------------------------------------------------------------------
# Particle helpers
# ---------------------------------------------------------------------------

def _generate_particles(rng: random.Random) -> list[dict]:
    """Return a list of particle dicts with position, size, color, opacity.

    Particles are distributed with a right-biased probability so that the
    left portion of the canvas (where the title sits) remains relatively
    sparse. The horizontal position is sampled from a beta distribution
    skewed towards the right.
    """
    particles: list[dict] = []

    color_choices = [
        ACCENT_LIME,
        WHITE,
        TEAL,
    ]
    # Weights so lime appears most, then white, then teal
    color_weights = [0.40, 0.35, 0.25]

    for _ in range(PARTICLE_COUNT):
        # Beta distribution alpha=2.5, beta=1.2 skews right
        norm_x = rng.betavariate(2.5, 1.2)
        x = int(norm_x * IMG_WIDTH)
        y = rng.randint(0, IMG_HEIGHT)

        radius = rng.uniform(1.0, 6.0)
        # Larger particles are rarer: shrink most via square root bias
        radius = 1.0 + (radius - 1.0) ** 0.65

        # Pick color
        roll = rng.random()
        cumulative = 0.0
        color = WHITE
        for c, w in zip(color_choices, color_weights):
            cumulative += w
            if roll <= cumulative:
                color = c
                break

        # Opacity 30-100% (expressed as 0-255 alpha)
        opacity = rng.randint(76, 255)

        particles.append({
            "x": x,
            "y": y,
            "radius": radius,
            "color": color,
            "opacity": opacity,
        })

    return particles


def _pick_constellation_edges(
    particles: list[dict],
    rng: random.Random,
) -> list[tuple[int, int]]:
    """Select pairs of particle indices to connect with thin lines.

    Only pairs within CONSTELLATION_MAX_DIST pixels are eligible. We
    pre-filter to the right half of the canvas so the constellation
    pattern reinforces the dense-right visual weight.
    """
    # Index particles that sit in the right 65% of the canvas
    right_indices = [
        i for i, p in enumerate(particles)
        if p["x"] > IMG_WIDTH * 0.35
    ]

    if len(right_indices) < 2:
        return []

    candidates: list[tuple[int, int, float]] = []
    # Sample random pairs to find close-enough ones (avoids O(n^2) full scan)
    attempts = 0
    max_attempts = CONSTELLATION_LINE_COUNT * 40
    while len(candidates) < CONSTELLATION_LINE_COUNT * 3 and attempts < max_attempts:
        i = rng.choice(right_indices)
        j = rng.choice(right_indices)
        if i >= j:
            attempts += 1
            continue
        dx = particles[i]["x"] - particles[j]["x"]
        dy = particles[i]["y"] - particles[j]["y"]
        dist = math.hypot(dx, dy)
        if dist <= CONSTELLATION_MAX_DIST:
            candidates.append((i, j, dist))
        attempts += 1

    # Pick the desired number, preferring shorter edges
    candidates.sort(key=lambda t: t[2])
    edges = [(a, b) for a, b, _ in candidates[:CONSTELLATION_LINE_COUNT]]
    return edges


def _draw_particles(
    img: Image.Image,
    particles: list[dict],
    edges: list[tuple[int, int]],
) -> None:
    """Composite particles and constellation lines onto the image.

    Uses a separate RGBA overlay to respect per-particle opacity, then
    alpha-composites onto the base RGB image.
    """
    overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # --- Constellation lines (drawn first, behind dots) ---
    for i, j in edges:
        p1 = particles[i]
        p2 = particles[j]
        # Line color: blend of the two endpoint colors at low opacity
        line_opacity = min(p1["opacity"], p2["opacity"]) // 3
        # Use a neutral white-ish line tinted slightly by endpoint colors
        avg_r = (p1["color"][0] + p2["color"][0]) // 2
        avg_g = (p1["color"][1] + p2["color"][1]) // 2
        avg_b = (p1["color"][2] + p2["color"][2]) // 2
        draw.line(
            [(p1["x"], p1["y"]), (p2["x"], p2["y"])],
            fill=(avg_r, avg_g, avg_b, line_opacity),
            width=1,
        )

    # --- Particles (dots) ---
    for p in particles:
        r = p["radius"]
        x, y = p["x"], p["y"]
        color_with_alpha = (*p["color"], p["opacity"])
        draw.ellipse(
            [(x - r, y - r), (x + r, y + r)],
            fill=color_with_alpha,
        )

    # Composite onto base
    base_rgba = img.convert("RGBA")
    composite = Image.alpha_composite(base_rgba, overlay)
    img.paste(composite.convert("RGB"))


# ---------------------------------------------------------------------------
# Glow / atmosphere effects
# ---------------------------------------------------------------------------

def _draw_glow_spots(img: Image.Image, rng: random.Random) -> None:
    """Add a few soft radial glow spots to give depth to the particle field.

    These are large, very low-opacity circles placed behind the particles
    to simulate light bleed from data-dense regions.
    """
    overlay = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    glows = [
        # (center_x, center_y, radius, color, alpha)
        (IMG_WIDTH * 0.78, IMG_HEIGHT * 0.35, 200, ACCENT_LIME, 12),
        (IMG_WIDTH * 0.60, IMG_HEIGHT * 0.70, 160, TEAL, 10),
        (IMG_WIDTH * 0.90, IMG_HEIGHT * 0.55, 140, WHITE, 8),
    ]

    for cx, cy, rad, color, alpha in glows:
        # Draw concentric circles with decreasing alpha for soft blur
        steps = 20
        for s in range(steps):
            frac = s / steps
            current_r = rad * (1.0 - frac * 0.8)
            current_alpha = int(alpha * (1.0 - frac))
            if current_alpha < 1:
                continue
            draw.ellipse(
                [
                    (cx - current_r, cy - current_r),
                    (cx + current_r, cy + current_r),
                ],
                fill=(*color, current_alpha),
            )

    base_rgba = img.convert("RGBA")
    composite = Image.alpha_composite(base_rgba, overlay)
    img.paste(composite.convert("RGB"))


# ---------------------------------------------------------------------------
# Text layout
# ---------------------------------------------------------------------------

def _draw_text_layer(
    img: Image.Image,
    title: str,
    tag: str,
) -> None:
    """Draw the tag pill, title text, and TendHunt branding onto the image."""
    draw = ImageDraw.Draw(img)

    # Load fonts
    title_font = _load_font(FONT_BOLD, 52)
    tag_font = _load_font(FONT_REGULAR, 20)
    brand_font = _load_font(FONT_BOLD, 24)
    brand_url_font = _load_font(FONT_REGULAR, 18)

    # --- Tag pill (top-left) ---
    tag_text = tag.upper()
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    pill_x = 60
    pill_y = 60
    pad_x = 16
    pad_y = 8

    draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pad_x * 2, pill_y + tag_h + pad_y * 2),
        ],
        radius=6,
        fill=ACCENT_LIME,
    )
    draw.text(
        (pill_x + pad_x, pill_y + pad_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # --- Title text (left-aligned, wrapped to ~26 chars) ---
    wrapped = textwrap.fill(title, width=26)
    lines = wrapped.split("\n")[:3]  # cap at 3 lines
    title_y = 130
    line_spacing = 14

    # Draw a subtle text shadow for legibility against particles
    shadow_color = (10, 10, 10, 200)
    for offset in [(2, 2), (1, 1), (-1, -1)]:
        for idx, line in enumerate(lines):
            y_pos = title_y + idx * (52 + line_spacing)
            draw.text(
                (60 + offset[0], y_pos + offset[1]),
                line,
                fill=shadow_color,
                font=title_font,
            )

    for idx, line in enumerate(lines):
        y_pos = title_y + idx * (52 + line_spacing)
        draw.text(
            (60, y_pos),
            line,
            fill=WHITE,
            font=title_font,
        )

    # --- TendHunt brand (bottom-left) ---
    brand_y = IMG_HEIGHT - 70
    draw.text((60, brand_y), "TendHunt", fill=ACCENT_LIME, font=brand_font)

    brand_bbox = draw.textbbox((60, brand_y), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 16
    draw.text(
        (url_x, brand_y + 4),
        "tendhunt.com/blog",
        fill=SECONDARY_TEXT,
        font=brand_url_font,
    )

    # --- Decorative accent dot (bottom-right) ---
    draw.ellipse(
        [
            (IMG_WIDTH - 100, IMG_HEIGHT - 100),
            (IMG_WIDTH - 60, IMG_HEIGHT - 60),
        ],
        fill=ACCENT_LIME,
    )


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_scatter_dots_thumbnail(
    title: str,
    tag: str,
    output_path: str | Path,
    seed: int = SEED,
) -> Path:
    """Generate a Data Scatter / Particle Field thumbnail.

    Args:
        title:       Article title to display.
        tag:         Primary tag shown in the lime accent pill.
        output_path: Destination path for the PNG image.
        seed:        Random seed for reproducible particle layouts.

    Returns:
        The resolved Path of the saved image.
    """
    rng = random.Random(seed)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Base canvas
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)

    # 2. Subtle grid underlay (very faint, like the original generator)
    draw = ImageDraw.Draw(img)
    grid_color = (15, 15, 15)
    for x in range(0, IMG_WIDTH, 60):
        draw.line([(x, 0), (x, IMG_HEIGHT)], fill=grid_color, width=1)
    for y in range(0, IMG_HEIGHT, 60):
        draw.line([(0, y), (IMG_WIDTH, y)], fill=grid_color, width=1)

    # 3. Atmospheric glow spots (behind particles)
    _draw_glow_spots(img, rng)

    # 4. Particles + constellation lines
    particles = _generate_particles(rng)
    edges = _pick_constellation_edges(particles, rng)
    _draw_particles(img, particles, edges)

    # 5. Text layer on top (tag pill, title, branding)
    _draw_text_layer(img, title, tag)

    # 6. Save
    img.save(str(output_path), "PNG", optimize=True)
    print(f"  Saved thumbnail: {output_path}")
    return output_path


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    default_title = "How to Find UK Government Tenders in 2026"
    default_tag = "UK Procurement"
    default_output = str(THUMBNAILS_DIR / "test_style_06.png")

    if len(sys.argv) >= 4:
        title = sys.argv[1]
        tag = sys.argv[2]
        output = sys.argv[3]
    else:
        title = default_title
        tag = default_tag
        output = default_output

    print(f"Style 06 - Data Scatter / Particle Field")
    print(f"  Title : {title}")
    print(f"  Tag   : {tag}")
    print(f"  Output: {output}")
    generate_scatter_dots_thumbnail(title, tag, output)
    print("Done.")
