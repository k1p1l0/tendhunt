"""Style 07: Bold Typography / Magazine Cover thumbnail.

Creates a 1200x630 blog thumbnail where the title IS the visual.
Massive text dominates the frame with the first word highlighted in
TendHunt lime (#E5FF00) and the rest in white against a near-black
background.  Decorative quotation marks and bracket underlines add
editorial flair without competing with the headline.

Usage:
    python thumbnail_styles/style_07_bold_typo.py
    python thumbnail_styles/style_07_bold_typo.py "Custom Title" "Custom Tag" output.png
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Resolve paths relative to the content-pipeline root (one level up)
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_PIPELINE_DIR = _SCRIPT_DIR.parent
_FONTS_DIR = _PIPELINE_DIR / "fonts"
_THUMBNAILS_DIR = _PIPELINE_DIR / "thumbnails"

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
BG_COLOR = (10, 10, 10)              # #0A0A0A
ACCENT_COLOR = (229, 255, 0)         # #E5FF00  (lime)
TEXT_COLOR = (255, 255, 255)          # White
SECONDARY_TEXT = (161, 161, 161)      # #A1A1A1
SUBTLE_BG = (18, 18, 18)             # Slightly lighter than bg for subtle shapes

# Image dimensions (Open Graph standard)
IMG_WIDTH = 1200
IMG_HEIGHT = 630

# Font files
FONT_BOLD_PATH = _FONTS_DIR / "SpaceGrotesk-Bold.ttf"
FONT_REGULAR_PATH = _FONTS_DIR / "Inter-Regular.ttf"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Load a TTF font or fall back to the Pillow default."""
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.load_default(size=size)


def _text_bbox(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont):
    """Return (width, height) for *text* rendered with *font*."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _split_highlight(title: str) -> tuple[str, str]:
    """Split *title* into (highlighted_word, remaining_text).

    The first word of the title is highlighted in lime.  If the first
    word is a short connector (3 chars or fewer like "A", "To", "How")
    the first TWO words are highlighted instead so the accent has
    enough visual mass to anchor the composition.
    """
    words = title.split()
    if not words:
        return ("", "")
    if len(words) == 1:
        return (words[0], "")

    first = words[0]
    if len(first) <= 3 and len(words) >= 2:
        highlight = f"{words[0]} {words[1]}"
        rest = " ".join(words[2:])
    else:
        highlight = words[0]
        rest = " ".join(words[1:])
    return (highlight, rest)


def _wrap_title_lines(
    title: str,
    font: ImageFont.FreeTypeFont,
    draw: ImageDraw.ImageDraw,
    max_width: int,
    max_lines: int = 4,
) -> list[str]:
    """Word-wrap *title* so each line fits within *max_width* pixels.

    Returns at most *max_lines* lines.  Uses a greedy algorithm that
    measures actual rendered width so kerning is respected.
    """
    words = title.split()
    lines: list[str] = []
    current_line = ""

    for word in words:
        test = f"{current_line} {word}".strip()
        w, _ = _text_bbox(draw, test, font)
        if w <= max_width:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
            if len(lines) >= max_lines:
                break

    if current_line and len(lines) < max_lines:
        lines.append(current_line)

    return lines


# ---------------------------------------------------------------------------
# Decorative drawing helpers
# ---------------------------------------------------------------------------

def _draw_quotation_marks(draw: ImageDraw.ImageDraw, font: ImageFont.FreeTypeFont) -> None:
    """Draw large decorative quotation marks in lime at low opacity.

    Since Pillow ImageDraw cannot do per-shape alpha easily on RGB images
    we simulate low opacity by mixing the accent color toward the background.
    """
    # Compute a ~15 % opacity lime against #0A0A0A
    alpha = 0.15
    muted = tuple(int(a * alpha + b * (1 - alpha)) for a, b in zip(ACCENT_COLOR, BG_COLOR))

    # Opening quote -- top-right area
    quote_font = _load_font(FONT_BOLD_PATH, 280)
    draw.text((900, -40), "\u201C", fill=muted, font=quote_font)

    # Closing quote -- bottom-left area (very subtle)
    draw.text((40, 340), "\u201D", fill=muted, font=quote_font)


def _draw_arrow_shape(draw: ImageDraw.ImageDraw) -> None:
    """Draw a large right-pointing chevron/arrow in the bottom-right corner.

    The arrow is rendered at very low opacity to add depth without
    distracting from the title text.
    """
    alpha = 0.08
    muted = tuple(int(a * alpha + b * (1 - alpha)) for a, b in zip(ACCENT_COLOR, BG_COLOR))

    # Chevron built from two thick lines meeting at a point
    cx, cy = IMG_WIDTH - 120, IMG_HEIGHT - 160
    size = 90
    thickness = 6
    # Upper arm
    draw.line(
        [(cx - size, cy - size), (cx, cy)],
        fill=muted,
        width=thickness,
    )
    # Lower arm
    draw.line(
        [(cx - size, cy + size), (cx, cy)],
        fill=muted,
        width=thickness,
    )


def _draw_bracket_underline(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    width: int,
) -> None:
    """Draw a decorative bracket/underline shape beneath the highlighted word.

    The shape is a flat bottom line with small vertical ticks on each end,
    creating a typographic bracket effect in lime.
    """
    line_y = y + 12
    tick_h = 8
    thickness = 3

    # Horizontal bar
    draw.line([(x, line_y), (x + width, line_y)], fill=ACCENT_COLOR, width=thickness)
    # Left tick (downward)
    draw.line([(x, line_y), (x, line_y + tick_h)], fill=ACCENT_COLOR, width=thickness)
    # Right tick (downward)
    draw.line(
        [(x + width, line_y), (x + width, line_y + tick_h)],
        fill=ACCENT_COLOR,
        width=thickness,
    )


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_bold_typo_thumbnail(
    title: str,
    tag: str,
    output_path: str | Path,
    *,
    highlight_word: Optional[str] = None,
) -> Path:
    """Generate a Style 07 Bold Typography thumbnail.

    Args:
        title: The article headline (the visual hero).
        tag: Category tag shown in a pill at the top.
        output_path: Destination file path (.png).
        highlight_word: Override automatic first-word detection.  When
            supplied, this exact substring of the title is rendered in
            lime while the rest stays white.

    Returns:
        The resolved ``Path`` to the saved image.
    """
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    # -- Canvas -----------------------------------------------------------
    img = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), BG_COLOR)
    draw = ImageDraw.ImageDraw(img)

    # -- Decorative background elements (drawn first, behind everything) --
    _draw_quotation_marks(draw, _load_font(FONT_BOLD_PATH, 280))
    _draw_arrow_shape(draw)

    # -- Subtle horizontal rule lines for editorial feel ------------------
    rule_color = (25, 25, 25)
    draw.line([(60, 64), (IMG_WIDTH - 60, 64)], fill=rule_color, width=1)
    draw.line([(60, IMG_HEIGHT - 64), (IMG_WIDTH - 60, IMG_HEIGHT - 64)], fill=rule_color, width=1)

    # -- Tag pill (top-left, inside the top rule) -------------------------
    tag_font = _load_font(FONT_REGULAR_PATH, 16)
    tag_text = tag.upper()
    tw, th = _text_bbox(draw, tag_text, tag_font)
    pill_x = 60
    pill_y = 78
    pad_x, pad_y = 14, 7
    draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + tw + pad_x * 2, pill_y + th + pad_y * 2)],
        radius=4,
        fill=ACCENT_COLOR,
    )
    draw.text((pill_x + pad_x, pill_y + pad_y), tag_text, fill=BG_COLOR, font=tag_font)

    # -- Determine title font size ----------------------------------------
    # Start large and reduce if the title won't fit in 4 lines
    title_font_size = 76
    line_spacing = 14
    max_text_width = IMG_WIDTH - 120  # 60px padding each side
    title_y_start = 140

    title_font = _load_font(FONT_BOLD_PATH, title_font_size)
    lines = _wrap_title_lines(title, title_font, draw, max_text_width, max_lines=4)

    # Shrink font if text block would overflow the available vertical space
    available_height = IMG_HEIGHT - title_y_start - 100  # 100px reserved for branding
    while len(lines) > 0:
        _, single_h = _text_bbox(draw, "Ag", title_font)
        total_h = single_h * len(lines) + line_spacing * (len(lines) - 1)
        if total_h <= available_height:
            break
        title_font_size -= 2
        if title_font_size < 40:
            break
        title_font = _load_font(FONT_BOLD_PATH, title_font_size)
        lines = _wrap_title_lines(title, title_font, draw, max_text_width, max_lines=4)

    # -- Determine which word(s) to highlight -----------------------------
    if highlight_word:
        hl_text = highlight_word
    else:
        hl_text, _ = _split_highlight(title)

    # Normalize for matching (case-insensitive startswith on each line)
    hl_lower = hl_text.lower()

    # -- Render title lines with selective highlighting -------------------
    _, single_line_h = _text_bbox(draw, "Ag", title_font)
    cursor_y = title_y_start
    highlight_drawn = False

    for line in lines:
        # Check if the highlighted word appears at the START of this line
        line_lower = line.lower()
        matched = False
        if not highlight_drawn and line_lower.startswith(hl_lower):
            matched = True
        # Also check if highlighted text is anywhere in the line
        elif not highlight_drawn and hl_lower in line_lower:
            matched = True

        if matched and not highlight_drawn:
            # Find the highlight substring (preserve original casing)
            idx = line_lower.index(hl_lower)
            before = line[:idx]
            hl_part = line[idx : idx + len(hl_text)]
            after = line[idx + len(hl_text) :]

            cx = 60
            # Draw text before highlight (white)
            if before:
                draw.text((cx, cursor_y), before, fill=TEXT_COLOR, font=title_font)
                bw, _ = _text_bbox(draw, before, title_font)
                cx += bw

            # Draw highlighted word(s) (lime)
            draw.text((cx, cursor_y), hl_part, fill=ACCENT_COLOR, font=title_font)
            hl_w, hl_h = _text_bbox(draw, hl_part, title_font)

            # Decorative bracket underline beneath the highlighted word
            _draw_bracket_underline(draw, cx, cursor_y + hl_h, hl_w)

            cx += hl_w

            # Draw text after highlight (white)
            if after:
                draw.text((cx, cursor_y), after, fill=TEXT_COLOR, font=title_font)

            highlight_drawn = True
        else:
            # Normal line -- all white
            draw.text((60, cursor_y), line, fill=TEXT_COLOR, font=title_font)

        cursor_y += single_line_h + line_spacing

    # -- Branding bar (bottom) --------------------------------------------
    brand_font = _load_font(FONT_BOLD_PATH, 20)
    url_font = _load_font(FONT_REGULAR_PATH, 15)

    # TendHunt in lime
    brand_y = IMG_HEIGHT - 52
    draw.text((60, brand_y), "TendHunt", fill=ACCENT_COLOR, font=brand_font)
    bw, _ = _text_bbox(draw, "TendHunt", brand_font)

    # Vertical separator bar
    sep_x = 60 + bw + 14
    draw.line(
        [(sep_x, brand_y + 2), (sep_x, brand_y + 18)],
        fill=SECONDARY_TEXT,
        width=1,
    )

    # URL in muted text
    draw.text((sep_x + 14, brand_y + 2), "tendhunt.com/blog", fill=SECONDARY_TEXT, font=url_font)

    # Small lime accent dot -- bottom right
    draw.ellipse(
        [(IMG_WIDTH - 88, IMG_HEIGHT - 52), (IMG_WIDTH - 76, IMG_HEIGHT - 40)],
        fill=ACCENT_COLOR,
    )

    # -- Save -------------------------------------------------------------
    img.save(str(output), "PNG", optimize=True)
    return output.resolve()


# ---------------------------------------------------------------------------
# CLI / test runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) >= 4:
        _title = sys.argv[1]
        _tag = sys.argv[2]
        _out = sys.argv[3]
    else:
        _title = "How to Find UK Government Tenders in 2026"
        _tag = "UK Procurement"
        _out = str(_THUMBNAILS_DIR / "test_style_07.png")

    print(f"Style 07 Bold Typo  |  \"{_title}\"")
    result = generate_bold_typo_thumbnail(_title, _tag, _out)
    print(f"Saved -> {result}")
