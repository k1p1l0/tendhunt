"""Style 10: Brutalist / Deconstructed thumbnail generator.

Generates a 1200x630 blog thumbnail with raw, punk-energy brutalist aesthetics:
- Dark #0A0A0A background with oversized geometric shapes
- Massive lime (#E5FF00) rectangles cropped at edges, rotated overlapping forms
- Thick white borders, intentionally broken grid, anti-corporate energy
- Title text slightly rotated for visual tension
- Large low-opacity watermark text behind everything
- Raw tag label with brackets instead of pill
- Minimal TendHunt branding at bottom

Uses Pillow only. Fonts: SpaceGrotesk-Bold.ttf and Inter-Regular.ttf.

Usage:
    python style_10_brutalist.py
    python style_10_brutalist.py "Custom Title" "Custom Tag" output.png
"""

import math
import sys
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

IMG_WIDTH = 1200
IMG_HEIGHT = 630

BG_COLOR = (10, 10, 10)              # #0A0A0A
LIME = (229, 255, 0)                 # #E5FF00
WHITE = (255, 255, 255)
NEAR_BLACK = (14, 14, 14)            # For shape fills that are barely visible

# Font paths (relative to this file -> ../fonts/)
FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"
FONT_BOLD = FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR = FONTS_DIR / "Inter-Regular.ttf"

# Output defaults
THUMBNAILS_DIR = Path(__file__).resolve().parent.parent / "thumbnails"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the built-in default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


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
    # We draw on an oversized transparent layer, rotate, then crop to canvas.
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

    # Place onto canvas-size layer at the desired center
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
    # Measure text bounding box
    tmp = Image.new("RGBA", (1, 1))
    tmp_d = ImageDraw.Draw(tmp)
    bbox = tmp_d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0] + 20
    th = bbox[3] - bbox[1] + 20

    # Draw text on tight layer
    text_layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    td = ImageDraw.Draw(text_layer)
    td.text((10, 10 - bbox[1]), text, fill=fill, font=font)

    # Rotate around center of text
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

    # Measure full block size
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

    # Draw all lines onto a single block layer
    block = Image.new("RGBA", (block_w, block_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(block)
    y_cursor = padding
    for i, line in enumerate(lines):
        bbox = bd.textbbox((0, 0), line, font=font)
        bd.text((padding, y_cursor - bbox[1]), line, fill=fill, font=font)
        y_cursor += line_heights[i] + line_spacing

    # Rotate the entire block
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
# Main generator
# ---------------------------------------------------------------------------

def generate_thumbnail(
    title: str,
    tag: str,
    output_path: str | Path,
) -> Path:
    """Generate a brutalist / deconstructed style blog thumbnail.

    Args:
        title: Article title to display.
        tag: Primary tag shown as raw bracketed label.
        output_path: Where to save the PNG.

    Returns:
        Resolved Path to the saved image.
    """
    canvas = (IMG_WIDTH, IMG_HEIGHT)
    img = Image.new("RGBA", canvas, BG_COLOR + (255,))

    # ------------------------------------------------------------------
    # Layer 1 -- Large watermark text in very low opacity lime
    # ------------------------------------------------------------------
    watermark_font = _load_font(FONT_BOLD, 320)
    wm_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    wm_draw = ImageDraw.Draw(wm_layer)
    # Draw the watermark characters -- shifted so they bleed off edges
    wm_draw.text(
        (30, 80),
        "UK",
        fill=LIME[:3] + (22,),  # Low alpha ~8.5%
        font=watermark_font,
    )

    # Second watermark element: large pound sign
    wm_font_2 = _load_font(FONT_BOLD, 450)
    wm_draw.text(
        (680, -60),
        "\u00a3",  # Pound sign
        fill=LIME[:3] + (18,),  # Low alpha ~7%
        font=wm_font_2,
    )
    img = Image.alpha_composite(img, wm_layer)

    # ------------------------------------------------------------------
    # Layer 2 -- Massive lime rectangle, cropped at edges
    # ------------------------------------------------------------------
    lime_rect = _rotated_rect(
        canvas,
        center=(1000, 310),
        width=520,
        height=750,
        angle_deg=10,
        fill=LIME + (50,),  # Low opacity fill ~20%
        outline=LIME + (110,),  # Brighter outline ~43%
        outline_width=6,
    )
    img = Image.alpha_composite(img, lime_rect)

    # ------------------------------------------------------------------
    # Layer 3 -- White-bordered rectangle, rotated opposite direction
    # ------------------------------------------------------------------
    white_rect = _rotated_rect(
        canvas,
        center=(830, 170),
        width=340,
        height=240,
        angle_deg=-7,
        fill=None,
        outline=WHITE + (85,),  # ~33% opacity
        outline_width=5,
    )
    img = Image.alpha_composite(img, white_rect)

    # ------------------------------------------------------------------
    # Layer 4 -- Small solid lime square, aggressively rotated
    # ------------------------------------------------------------------
    small_lime = _rotated_rect(
        canvas,
        center=(150, 510),
        width=100,
        height=100,
        angle_deg=15,
        fill=LIME + (60,),  # ~24% opacity
        outline=WHITE + (40,),
        outline_width=2,
    )
    img = Image.alpha_composite(img, small_lime)

    # ------------------------------------------------------------------
    # Layer 5 -- Another deconstructed shape: tall narrow bar
    # ------------------------------------------------------------------
    tall_bar = _rotated_rect(
        canvas,
        center=(1120, 500),
        width=60,
        height=300,
        angle_deg=-12,
        fill=WHITE + (20,),  # Very subtle
        outline=WHITE + (50,),
        outline_width=3,
    )
    img = Image.alpha_composite(img, tall_bar)

    # ------------------------------------------------------------------
    # Layer 6 -- Diagonal slash / line across the composition
    # ------------------------------------------------------------------
    line_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    line_draw = ImageDraw.Draw(line_layer)
    line_draw.line(
        [(0, 480), (IMG_WIDTH, 380)],
        fill=LIME[:3] + (25,),
        width=3,
    )
    img = Image.alpha_composite(img, line_layer)

    # ------------------------------------------------------------------
    # Layer 7 -- Another diagonal line crossing in opposite direction
    # ------------------------------------------------------------------
    line_layer2 = Image.new("RGBA", canvas, (0, 0, 0, 0))
    line_draw2 = ImageDraw.Draw(line_layer2)
    line_draw2.line(
        [(800, 0), (1200, 630)],
        fill=WHITE[:3] + (15,),
        width=2,
    )
    img = Image.alpha_composite(img, line_layer2)

    # ------------------------------------------------------------------
    # Layer 8 -- Tag as raw label: [ UK PROCUREMENT ]
    # ------------------------------------------------------------------
    tag_font = _load_font(FONT_REGULAR, 18)
    tag_text = f"[ {tag.upper()} ]"

    tag_layer = _rotated_text(
        canvas,
        position=(70, 70),
        text=tag_text,
        font=tag_font,
        fill=LIME + (220,),
        angle_deg=0,  # Tag stays level for legibility
    )

    # Draw a strikethrough line across the tag
    tmp = Image.new("RGBA", (1, 1))
    tmp_d = ImageDraw.Draw(tmp)
    tag_bbox = tmp_d.textbbox((0, 0), tag_text, font=tag_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]

    strike_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    strike_draw = ImageDraw.Draw(strike_layer)
    strike_y = 70 + tag_h // 2 + 2
    strike_draw.line(
        [(68, strike_y), (68 + tag_w + 8, strike_y)],
        fill=LIME[:3] + (60,),
        width=1,
    )

    img = Image.alpha_composite(img, tag_layer)
    img = Image.alpha_composite(img, strike_layer)

    # ------------------------------------------------------------------
    # Layer 9 -- Title text, bold white, slightly rotated (-2 degrees)
    # ------------------------------------------------------------------
    title_font = _load_font(FONT_BOLD, 58)
    wrapped_title = textwrap.fill(title, width=22)
    lines = wrapped_title.split("\n")[:3]  # Max 3 lines
    wrapped_title = "\n".join(lines)

    title_layer = _multiline_rotated_text(
        canvas,
        position=(70, 120),
        text=wrapped_title,
        font=title_font,
        fill=WHITE + (255,),
        angle_deg=-2,  # Negative rotation (clockwise tilt) for raw energy
        line_spacing=18,
    )
    img = Image.alpha_composite(img, title_layer)

    # ------------------------------------------------------------------
    # Layer 10 -- Thick accent bar, partially visible, left edge bleed
    # ------------------------------------------------------------------
    accent_bar = _rotated_rect(
        canvas,
        center=(-10, 340),
        width=70,
        height=280,
        angle_deg=5,
        fill=LIME + (90,),
    )
    # Additional: horizontal disruption band across lower third
    band_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    band_draw = ImageDraw.Draw(band_layer)
    band_draw.rectangle(
        [(0, 420), (IMG_WIDTH, 424)],
        fill=LIME[:3] + (35,),
    )
    band_draw.rectangle(
        [(0, 428), (IMG_WIDTH, 430)],
        fill=WHITE[:3] + (18,),
    )
    img = Image.alpha_composite(img, accent_bar)
    img = Image.alpha_composite(img, band_layer)

    # ------------------------------------------------------------------
    # Layer 11 -- Small decorative squares cluster (top-right)
    # ------------------------------------------------------------------
    for offset_x, offset_y, sz, ang, alpha in [
        (1050, 55, 35, 22, 45),
        (1095, 85, 24, -12, 35),
        (1025, 100, 18, 38, 28),
        (1070, 120, 12, -5, 20),
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

    # ------------------------------------------------------------------
    # Layer 12 -- Bottom branding: TendHunt, minimal
    # ------------------------------------------------------------------
    brand_font = _load_font(FONT_BOLD, 18)
    url_font = _load_font(FONT_REGULAR, 14)

    brand_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    bd = ImageDraw.Draw(brand_layer)

    # Brand name in lime
    bd.text(
        (70, IMG_HEIGHT - 50),
        "TENDHUNT",
        fill=LIME[:3] + (180,),
        font=brand_font,
    )

    # URL in muted white
    brand_bbox = bd.textbbox((70, IMG_HEIGHT - 50), "TENDHUNT", font=brand_font)
    url_x = brand_bbox[2] + 14
    bd.text(
        (url_x, IMG_HEIGHT - 47),
        "tendhunt.com",
        fill=WHITE[:3] + (80,),
        font=url_font,
    )

    # Small raw line separator before branding
    bd.line(
        [(70, IMG_HEIGHT - 62), (250, IMG_HEIGHT - 62)],
        fill=WHITE[:3] + (30,),
        width=1,
    )

    img = Image.alpha_composite(img, brand_layer)

    # ------------------------------------------------------------------
    # Layer 13 -- Final edge accents: top-left corner mark
    # ------------------------------------------------------------------
    corner_layer = Image.new("RGBA", canvas, (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner_layer)
    # Top-left corner bracket -- thick and aggressive
    cd.line([(16, 16), (16, 70)], fill=LIME[:3] + (130,), width=4)
    cd.line([(16, 16), (70, 16)], fill=LIME[:3] + (130,), width=4)
    # Bottom-right corner bracket
    cd.line(
        [(IMG_WIDTH - 16, IMG_HEIGHT - 16), (IMG_WIDTH - 16, IMG_HEIGHT - 70)],
        fill=LIME[:3] + (130,),
        width=4,
    )
    cd.line(
        [(IMG_WIDTH - 16, IMG_HEIGHT - 16), (IMG_WIDTH - 70, IMG_HEIGHT - 16)],
        fill=LIME[:3] + (130,),
        width=4,
    )
    img = Image.alpha_composite(img, corner_layer)

    # ------------------------------------------------------------------
    # Flatten to RGB and save
    # ------------------------------------------------------------------
    final = img.convert("RGB")
    output = Path(output_path).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    final.save(str(output), "PNG", optimize=True)
    print(f"  [style_10_brutalist] Saved: {output}")
    return output


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    default_title = "How to Find UK Government Tenders in 2026"
    default_tag = "UK Procurement"
    default_output = str(THUMBNAILS_DIR / "test_style_10.png")

    if len(sys.argv) >= 4:
        title = sys.argv[1]
        tag = sys.argv[2]
        out = sys.argv[3]
    else:
        title = default_title
        tag = default_tag
        out = default_output

    print(f"Generating brutalist thumbnail: {title}")
    result_path = generate_thumbnail(title, tag, out)
    print(f"Done. Output: {result_path}")
