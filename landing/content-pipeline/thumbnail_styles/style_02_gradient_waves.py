"""Style 02: Gradient Waves / Aurora thumbnail generator.

Creates 1200x630 blog thumbnails with a premium aurora borealis wave effect.
Dark background with flowing sine-wave gradients from lime to teal,
left-aligned bold title, tag pill, and TendHunt branding.

Inspired by Stripe and Linear blog aesthetics.

Usage:
    python style_02_gradient_waves.py
    python style_02_gradient_waves.py "Custom Title" "Custom Tag" output.png
"""

import math
import random
import sys
import textwrap
from pathlib import Path
from typing import Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# Brand constants
# ---------------------------------------------------------------------------
IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)  # #0A0A0A
ACCENT_LIME = (229, 255, 0)  # #E5FF00
ACCENT_TEAL = (20, 184, 166)  # #14B8A6
TEXT_WHITE = (255, 255, 255)
SECONDARY_TEXT = (161, 161, 161)  # #A1A1A1

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).parent
FONTS_DIR = SCRIPT_DIR.parent / "fonts"
THUMBNAILS_DIR = SCRIPT_DIR.parent / "thumbnails"

FONT_BOLD_PATH = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR_PATH = FONTS_DIR / "Inter-Regular.ttf"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font, falling back to default if unavailable."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _lerp_color(
    c1: Tuple[int, int, int],
    c2: Tuple[int, int, int],
    t: float,
) -> Tuple[int, int, int]:
    """Linearly interpolate between two RGB colors. t in [0, 1]."""
    t = max(0.0, min(1.0, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _lerp_color_3(
    c1: Tuple[int, int, int],
    c2: Tuple[int, int, int],
    c3: Tuple[int, int, int],
    t: float,
) -> Tuple[int, int, int]:
    """Interpolate across three colors. t in [0, 1]: c1 -> c2 -> c3."""
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return _lerp_color(c1, c2, t * 2)
    return _lerp_color(c2, c3, (t - 0.5) * 2)


def _ease_in_out(t: float) -> float:
    """Smooth ease-in-out curve (cubic)."""
    if t < 0.5:
        return 4 * t * t * t
    return 1 - (-2 * t + 2) ** 3 / 2


# ---------------------------------------------------------------------------
# Wave / aurora drawing
# ---------------------------------------------------------------------------

def _draw_single_wave(
    img: Image.Image,
    y_center: int,
    amplitude: float,
    freq: float,
    phase: float,
    c_start: Tuple[int, int, int],
    c_mid: Tuple[int, int, int],
    c_end: Tuple[int, int, int],
    peak_alpha: int,
    thickness: int,
    blur_radius: int,
    x_bias: float = 0.5,
) -> Image.Image:
    """Draw a single aurora wave band with 3-stop color gradient.

    Args:
        img: Base image to composite onto.
        y_center: Vertical center of the wave.
        amplitude: Vertical oscillation amplitude in pixels.
        freq: Frequency multiplier for the sine wave.
        phase: Phase offset in radians.
        c_start: Color at x=0.
        c_mid: Color at midpoint.
        c_end: Color at x=IMG_WIDTH.
        peak_alpha: Maximum opacity (0-255).
        thickness: Vertical thickness of the wave band.
        blur_radius: Gaussian blur radius for smooth glow.
        x_bias: Horizontal luminance bias (0=left, 0.5=center, 1=right).
    """
    layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)

    strip_w = 2
    for x in range(0, IMG_WIDTH, strip_w):
        x_ratio = x / IMG_WIDTH

        # Multi-harmonic sine wave for organic flowing shape
        wave_y = y_center
        wave_y += amplitude * math.sin(freq * x * 2 * math.pi + phase)
        wave_y += (amplitude * 0.35) * math.sin(freq * 1.8 * x * 2 * math.pi + phase * 2.1)
        wave_y += (amplitude * 0.15) * math.sin(freq * 3.2 * x * 2 * math.pi + phase * 0.7)

        # 3-stop color gradient
        color = _lerp_color_3(c_start, c_mid, c_end, x_ratio)

        # Alpha envelope: bell curve centered at x_bias
        dist_from_peak = abs(x_ratio - x_bias) / max(x_bias, 1 - x_bias)
        alpha_envelope = math.exp(-2.5 * dist_from_peak * dist_from_peak)
        # Ensure gentle fade at canvas edges
        edge_fade = min(x_ratio / 0.08, 1.0) * min((1 - x_ratio) / 0.08, 1.0)
        alpha = int(peak_alpha * alpha_envelope * edge_fade)

        if alpha < 1:
            continue

        half_t = thickness / 2
        top = int(wave_y - half_t)
        bottom = int(wave_y + half_t)
        seg_h = bottom - top
        if seg_h <= 0:
            continue

        # Vertical gradient within the band: Gaussian falloff from center
        for y_off in range(0, seg_h, 2):
            y_pos = top + y_off
            if y_pos < 0 or y_pos >= IMG_HEIGHT:
                continue
            dist = abs(y_off - seg_h / 2) / (seg_h / 2 + 0.001)
            local_alpha = int(alpha * math.exp(-2.8 * dist * dist))
            if local_alpha < 1:
                continue
            layer_draw.rectangle(
                [(x, y_pos), (x + strip_w, y_pos + 2)],
                fill=(*color, local_alpha),
            )

    # Smooth glow via blur
    layer = layer.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # Composite
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    return img


def _draw_wave_line(
    img: Image.Image,
    y_center: int,
    amplitude: float,
    freq: float,
    phase: float,
    color: Tuple[int, int, int],
    alpha: int,
    line_width: int = 2,
    blur_radius: int = 3,
) -> Image.Image:
    """Draw a single crisp flowing wave line (anti-aliased stroke).

    These thin lines ride on top of the soft glow bands to give the
    aurora its distinctive flowing-line aesthetic like Stripe/Linear blogs.
    """
    layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)

    points = []
    for x in range(0, IMG_WIDTH, 2):
        x_ratio = x / IMG_WIDTH
        wave_y = y_center
        wave_y += amplitude * math.sin(freq * x * 2 * math.pi + phase)
        wave_y += (amplitude * 0.35) * math.sin(freq * 1.8 * x * 2 * math.pi + phase * 2.1)
        wave_y += (amplitude * 0.12) * math.sin(freq * 3.5 * x * 2 * math.pi + phase * 0.6)

        # Alpha fades at edges, peaks in center-right
        edge_fade = min(x_ratio / 0.1, 1.0) * min((1 - x_ratio) / 0.1, 1.0)
        center_boost = math.exp(-3.0 * (x_ratio - 0.55) ** 2)
        local_alpha = int(alpha * edge_fade * (0.3 + 0.7 * center_boost))

        points.append((x, int(wave_y), local_alpha))

    # Draw line segments with per-segment alpha
    for i in range(len(points) - 1):
        x1, y1, a1 = points[i]
        x2, y2, a2 = points[i + 1]
        avg_alpha = (a1 + a2) // 2
        if avg_alpha < 2:
            continue
        layer_draw.line(
            [(x1, y1), (x2, y2)],
            fill=(*color, avg_alpha),
            width=line_width,
        )

    if blur_radius > 0:
        layer = layer.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    return img


def _draw_aurora_waves(img: Image.Image, seed: int = 42) -> Image.Image:
    """Draw the full multi-layered aurora wave field.

    Layers are drawn back-to-front: deep teal wash first, then
    progressively brighter lime waves on top, creating depth.
    """
    rng = random.Random(seed)

    # Each tuple:
    # (y_center, amplitude, freq, phase, c_start, c_mid, c_end,
    #  peak_alpha, thickness, blur_radius, x_bias)
    layers = [
        # --- Deep background glow (wide, faint, teal) ---
        (
            480, 100, 0.0025, 0.3,
            (5, 70, 65), ACCENT_TEAL, (5, 50, 45),
            100, 320, 65, 0.65,
        ),
        # --- Secondary teal sweep ---
        (
            370, 85, 0.004, 1.0,
            (10, 120, 110), ACCENT_TEAL, (8, 80, 70),
            140, 240, 50, 0.6,
        ),
        # --- Teal-to-lime transition (mid-field) ---
        (
            310, 75, 0.005, 2.2,
            ACCENT_TEAL, (120, 210, 80), ACCENT_LIME,
            160, 180, 38, 0.55,
        ),
        # --- Primary lime wave (bright, medium width) ---
        (
            265, 60, 0.007, 0.6,
            ACCENT_LIME, (210, 245, 0), ACCENT_TEAL,
            200, 130, 24, 0.55,
        ),
        # --- Hot lime core (brightest, narrow) ---
        (
            250, 45, 0.009, 3.5,
            (250, 255, 140), ACCENT_LIME, (170, 220, 0),
            220, 70, 14, 0.52,
        ),
        # --- Highlight shimmer (very thin, intense white-lime) ---
        (
            245, 30, 0.013, 4.1,
            (255, 255, 200), (245, 255, 120), ACCENT_LIME,
            170, 28, 8, 0.52,
        ),
        # --- Lower teal accent wave ---
        (
            510, 65, 0.004, 5.0,
            (12, 110, 100), ACCENT_TEAL, (10, 70, 60),
            90, 200, 45, 0.7,
        ),
        # --- Upper faint lime haze ---
        (
            175, 50, 0.006, 5.8,
            (90, 120, 0), ACCENT_LIME, (50, 90, 0),
            65, 160, 50, 0.45,
        ),
        # --- Far right bright teal splash ---
        (
            390, 55, 0.008, 2.8,
            (8, 60, 55), ACCENT_TEAL, (40, 210, 190),
            120, 140, 30, 0.8,
        ),
        # --- Extra: bright lime accent at center-right ---
        (
            280, 35, 0.011, 1.5,
            (200, 240, 0), ACCENT_LIME, (180, 220, 0),
            150, 50, 18, 0.6,
        ),
    ]

    for cfg in layers:
        (y_c, amp, fr, ph, cs, cm, ce, pa, th, bl, xb) = cfg
        # Deterministic but slight randomness per wave
        ph += rng.uniform(-0.4, 0.4)
        y_c += rng.randint(-10, 10)
        img = _draw_single_wave(img, y_c, amp, fr, ph, cs, cm, ce, pa, th, bl, xb)

    # --- Crisp flowing wave lines on top of the glow ---
    # These give the aurora its sharp, premium "Stripe" aesthetic
    wave_lines = [
        # (y_center, amplitude, freq, phase, color, alpha, width, blur)
        # Bright lime primary line
        (258, 48, 0.009, 3.5, ACCENT_LIME, 200, 2, 2),
        # Teal secondary line below
        (340, 70, 0.005, 2.2, ACCENT_TEAL, 160, 2, 2),
        # Bright white-lime highlight
        (250, 42, 0.0095, 3.7, (240, 255, 100), 140, 1, 1),
        # Deep teal low line
        (430, 55, 0.004, 5.0, ACCENT_TEAL, 100, 2, 3),
        # Upper lime accent
        (195, 40, 0.007, 0.6, (180, 220, 0), 90, 1, 2),
        # Faint mid teal
        (380, 60, 0.006, 1.0, (15, 150, 140), 80, 1, 2),
    ]

    for wl in wave_lines:
        y_c, amp, fr, ph, col, al, wid, bl = wl
        ph += rng.uniform(-0.3, 0.3)
        y_c += rng.randint(-5, 5)
        img = _draw_wave_line(img, y_c, amp, fr, ph, col, al, wid, bl)

    return img


def _draw_glow_orb(
    img: Image.Image,
    center_x: int,
    center_y: int,
    radius: int,
    color: Tuple[int, int, int],
    max_alpha: int = 40,
) -> Image.Image:
    """Draw a soft radial glow orb for ambient lighting."""
    layer = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    step = max(1, radius // 120)  # Adaptive step for smooth gradients
    for r in range(radius, 0, -step):
        t = r / radius
        alpha = int(max_alpha * (1 - t) ** 1.8)
        if alpha < 1:
            continue
        draw.ellipse(
            [(center_x - r, center_y - r), (center_x + r, center_y + r)],
            fill=(*color, alpha),
        )
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    return img


def _draw_subtle_noise(img: Image.Image, intensity: int = 6, seed: int = 42) -> Image.Image:
    """Add subtle film-grain noise to prevent color banding in gradients."""
    rng = random.Random(seed)
    pixels = img.load()
    for y in range(0, IMG_HEIGHT, 2):
        for x in range(0, IMG_WIDTH, 2):
            noise = rng.randint(-intensity, intensity)
            r, g, b = pixels[x, y]
            pixels[x, y] = (
                max(0, min(255, r + noise)),
                max(0, min(255, g + noise)),
                max(0, min(255, b + noise)),
            )
    return img


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_thumbnail(
    title: str,
    tag: str,
    output_path: str,
    seed: int = 42,
) -> None:
    """Generate a Style 02 Gradient Waves / Aurora thumbnail.

    Args:
        title: Article title to render.
        tag: Tag shown in the accent pill.
        output_path: Destination PNG file path.
        seed: Random seed for deterministic wave variation.
    """
    # ------------------------------------------------------------------
    # 1. Base image - dark background
    # ------------------------------------------------------------------
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)

    # ------------------------------------------------------------------
    # 2. Large ambient glow orbs (behind everything, set the atmosphere)
    # ------------------------------------------------------------------
    img = _draw_glow_orb(img, 800, 300, 500, ACCENT_TEAL, max_alpha=55)
    img = _draw_glow_orb(img, 600, 250, 400, ACCENT_LIME, max_alpha=35)
    img = _draw_glow_orb(img, 1050, 380, 350, (15, 160, 145), max_alpha=40)
    img = _draw_glow_orb(img, 950, 200, 300, (100, 180, 0), max_alpha=20)

    # ------------------------------------------------------------------
    # 3. Aurora waves (the hero visual)
    # ------------------------------------------------------------------
    img = _draw_aurora_waves(img, seed=seed)

    # ------------------------------------------------------------------
    # 4. Film grain to smooth banding
    # ------------------------------------------------------------------
    img = _draw_subtle_noise(img, intensity=5, seed=seed)

    # ------------------------------------------------------------------
    # 5. Vignette overlays for text legibility
    # ------------------------------------------------------------------
    vignette = Image.new("RGBA", (IMG_WIDTH, IMG_HEIGHT), (0, 0, 0, 0))
    vig_draw = ImageDraw.Draw(vignette)

    # Left-side text protection: strong dark on far left, soft fade
    for x in range(0, 550):
        t = x / 550
        # Ease out so protection is strong near text, fades gently
        alpha = int(180 * (1 - t) ** 1.5)
        vig_draw.line([(x, 0), (x, IMG_HEIGHT)], fill=(10, 10, 10, alpha))

    # Top corner darkening
    for y in range(0, 80):
        t = y / 80
        alpha = int(80 * (1 - t))
        vig_draw.line([(0, y), (600, y)], fill=(10, 10, 10, alpha))

    # Bottom strip darkening for branding area
    for y in range(IMG_HEIGHT - 90, IMG_HEIGHT):
        t = (y - (IMG_HEIGHT - 90)) / 90
        alpha = int(150 * t)
        vig_draw.line([(0, y), (IMG_WIDTH, y)], fill=(10, 10, 10, alpha))

    img = Image.alpha_composite(img.convert("RGBA"), vignette).convert("RGB")

    # ------------------------------------------------------------------
    # 6. Typography
    # ------------------------------------------------------------------
    draw = ImageDraw.Draw(img)

    # Font sizes tuned for visual impact at 1200x630
    title_font = _load_font(FONT_BOLD_PATH, 62)
    tag_font = _load_font(FONT_REGULAR_PATH, 18)
    brand_font = _load_font(FONT_BOLD_PATH, 22)
    brand_url_font = _load_font(FONT_REGULAR_PATH, 16)

    margin_left = 64

    # --- Tag pill (lime accent, dark text) ---
    tag_text = tag.upper()
    tag_bbox = draw.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]
    pill_x = margin_left
    pill_y = 64
    pad_x = 18
    pad_y = 9

    draw.rounded_rectangle(
        [
            (pill_x, pill_y),
            (pill_x + tag_w + pad_x * 2, pill_y + tag_h + pad_y * 2),
        ],
        radius=8,
        fill=ACCENT_LIME,
    )
    draw.text(
        (pill_x + pad_x, pill_y + pad_y),
        tag_text,
        fill=BG_COLOR,
        font=tag_font,
    )

    # --- Title text (bold, white, left-aligned) ---
    wrapped = textwrap.fill(title, width=20)
    lines = wrapped.split("\n")[:3]

    title_y = 120
    line_spacing = 16

    # Compute line positions once
    line_positions = []
    for i, line in enumerate(lines):
        lb = draw.textbbox((0, 0), line, font=title_font)
        lh = lb[3] - lb[1]
        y_pos = title_y + i * (lh + line_spacing)
        line_positions.append((line, y_pos))

    # Text shadow for depth (dark halo)
    shadow_color = (8, 8, 8)
    for line, y_pos in line_positions:
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                if dx == 0 and dy == 0:
                    continue
                draw.text(
                    (margin_left + dx, y_pos + dy),
                    line,
                    fill=shadow_color,
                    font=title_font,
                )

    # Main title in crisp white
    for line, y_pos in line_positions:
        draw.text(
            (margin_left, y_pos),
            line,
            fill=TEXT_WHITE,
            font=title_font,
        )

    # --- Accent divider line ---
    divider_y = IMG_HEIGHT - 78
    draw.line(
        [(margin_left, divider_y), (margin_left + 80, divider_y)],
        fill=ACCENT_LIME,
        width=2,
    )

    # --- Brand name (lime) ---
    brand_y = IMG_HEIGHT - 58
    draw.text(
        (margin_left, brand_y),
        "TendHunt",
        fill=ACCENT_LIME,
        font=brand_font,
    )

    # --- Brand URL (muted) ---
    brand_bbox = draw.textbbox((margin_left, brand_y), "TendHunt", font=brand_font)
    url_x = brand_bbox[2] + 14
    draw.text(
        (url_x, brand_y + 3),
        "tendhunt.com/blog",
        fill=SECONDARY_TEXT,
        font=brand_url_font,
    )

    # ------------------------------------------------------------------
    # 7. Save
    # ------------------------------------------------------------------
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output), "PNG", optimize=True)
    print(f"[style_02] Saved: {output} ({IMG_WIDTH}x{IMG_HEIGHT})")


# ---------------------------------------------------------------------------
# CLI / test entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        # CLI mode: title tag output_path
        _title = sys.argv[1]
        _tag = sys.argv[2]
        _output = sys.argv[3]
    else:
        # Default test mode
        _title = "How to Find UK Government Tenders in 2026"
        _tag = "UK Procurement"
        _output = str(THUMBNAILS_DIR / "test_style_02.png")

    print("Generating Style 02 (Gradient Waves) thumbnail...")
    print(f"  Title: {_title}")
    print(f"  Tag:   {_tag}")
    generate_thumbnail(_title, _tag, _output)
    print("Done.")
