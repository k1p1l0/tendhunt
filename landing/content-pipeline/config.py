"""Shared configuration for the TendHunt content pipeline."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# === API Configuration ===
GHOST_URL = os.getenv("GHOST_URL", "https://ghost-admin.tendhunt.com")
GHOST_ADMIN_KEY = os.getenv("GHOST_ADMIN_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# === Brand Constants ===
BG_COLOR = (10, 10, 10)            # #0A0A0A
ACCENT_COLOR = (229, 255, 0)       # #E5FF00
TEXT_COLOR = (255, 255, 255)        # White
SECONDARY_TEXT = (161, 161, 161)    # #A1A1A1
GRID_COLOR = (20, 20, 20)          # #141414

# === Image Dimensions ===
IMG_WIDTH = 1200
IMG_HEIGHT = 630

# === Directory Paths ===
BASE_DIR = Path(__file__).parent
ARTICLES_DIR = BASE_DIR / "articles"
THUMBNAILS_DIR = BASE_DIR / "thumbnails"
OUTPUT_DIR = BASE_DIR / "output"
FONTS_DIR = BASE_DIR / "fonts"
TEMPLATES_DIR = BASE_DIR / "templates"

# Ensure directories exist
ARTICLES_DIR.mkdir(exist_ok=True)
THUMBNAILS_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
FONTS_DIR.mkdir(exist_ok=True)
