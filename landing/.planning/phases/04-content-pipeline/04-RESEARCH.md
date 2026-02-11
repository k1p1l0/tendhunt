# Phase 4: Content Pipeline - Research

**Researched:** 2026-02-11
**Domain:** AI article generation, Ghost Admin API publishing, Pillow thumbnail generation, Lexical format conversion
**Confidence:** HIGH

## Summary

This research covers building an automated content pipeline that generates AI-drafted SEO articles, creates branded thumbnail images, converts content to Ghost's Lexical format, and publishes via the Ghost Admin API -- resulting in 5-10 live articles at `tendhunt.com/blog`. The pipeline is Python-based, matching the user's existing workflow from the Getmany project.

The critical technical finding is that Ghost's Admin API supports a **`source=html` query parameter** that converts HTML to Lexical automatically. Furthermore, wrapping HTML in `<!--kg-card-begin: html-->` / `<!--kg-card-end: html-->` comments provides **lossless** conversion -- Ghost preserves the HTML verbatim as an HTML card. This means the pipeline does NOT need to generate Lexical JSON directly (which is complex and underdocumented). Instead: Markdown -> HTML -> Ghost API with `?source=html` using the kg-card wrapper.

For thumbnail generation, the pipeline has two viable approaches: (1) **Pillow-based branded templates** -- deterministic, free, fast, matches TendHunt brand exactly; (2) **OpenAI GPT Image API** -- generates unique visual illustrations per article but costs $0.04-0.08/image and may not consistently match the brand. The recommended approach is Pillow templates for consistent branded thumbnails, with optional GPT Image for supplementary in-article illustrations.

**Primary recommendation:** Build a Python pipeline with 3 stages: (1) OpenAI GPT-4o generates article markdown from SEO topic prompts, (2) Pillow generates branded 1200x630 featured images using the TendHunt dark theme + accent, (3) Python script converts markdown to HTML, wraps in kg-card comments, uploads thumbnail via Ghost image API, and creates post as draft via Ghost Admin API with `?source=html`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | 1.68+ | AI article text generation | Official Python SDK for GPT-4o chat completions. Generates structured markdown articles from topic/keyword prompts. |
| `Pillow` | 11.x | Branded thumbnail image generation | Python imaging standard. Creates 1200x630 images with text, gradients, and brand elements. Zero external API cost. |
| `requests` | 2.32+ | HTTP client for Ghost Admin API | Industry-standard Python HTTP library. Used for REST API calls to create posts and upload images. |
| `PyJWT` | 2.9+ | Ghost Admin API JWT authentication | Official JWT library. Ghost Admin API requires HS256 JWT tokens generated from API key. |
| `markdown` | 3.7+ | Markdown to HTML conversion | Python-Markdown reference implementation. Converts AI-generated markdown to well-formed HTML for Ghost ingestion. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python-frontmatter` | 1.1+ | Parse markdown files with YAML frontmatter | When reading article files that contain title, slug, tags, excerpt as YAML metadata above the markdown body. |
| `python-slugify` | 8.0+ | Generate URL slugs from titles | When creating article slugs from titles (e.g., "How to Win UK Contracts" -> "how-to-win-uk-contracts"). |
| `python-dotenv` | 1.0+ | Environment variable management | For storing Ghost API key, OpenAI API key, Ghost admin URL without hardcoding in scripts. |
| `beautifulsoup4` | 4.12+ | HTML post-processing (optional) | For adding internal links, fixing formatting issues, or injecting structured data into generated HTML. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pillow for thumbnails | OpenAI GPT Image API (`gpt-image-1`) | GPT Image generates unique illustrations ($0.04-0.08/img) but inconsistent brand match. Pillow is free, deterministic, and guarantees brand compliance. Use GPT Image only if unique per-article artwork is required. |
| Pillow for thumbnails | HTML-to-image (playwright screenshot) | Renders HTML/CSS to PNG. More flexible for complex layouts but requires browser dependency. Overkill for simple branded text-on-gradient thumbnails. |
| `markdown` library | `mistune` | Mistune is faster but less extensible. Python-Markdown has mature extension ecosystem (tables, code highlighting, footnotes). Standard for content pipelines. |
| OpenAI GPT-4o | Anthropic Claude Haiku | Claude Haiku is referenced in PROJECT.md for Vibe Scanner. For article generation, GPT-4o is recommended because the user already has an OpenAI API key and existing article generation scripts used OpenAI. |
| Python requests + PyJWT | `@tryghost/admin-api` (Node.js) | Ghost's official SDK is JavaScript only. Python pipeline matches user's existing workflow and avoids language mixing. |

**Installation:**

```bash
# Create virtual environment for content pipeline
cd landing/content-pipeline
python3 -m venv .venv
source .venv/bin/activate

# Core dependencies
pip install openai pillow requests pyjwt markdown python-frontmatter python-slugify python-dotenv beautifulsoup4

# Save requirements
pip freeze > requirements.txt
```

---

## Architecture Patterns

### Recommended Project Structure

```
landing/content-pipeline/
├── .env                          # API keys (GHOST_ADMIN_KEY, OPENAI_API_KEY, GHOST_URL)
├── .env.example                  # Template without secrets
├── requirements.txt              # Python dependencies
├── generate_articles.py          # Stage 1: AI generates article markdown
├── generate_thumbnails.py        # Stage 2: Pillow creates branded featured images
├── publish_to_ghost.py           # Stage 3: Upload images + publish posts to Ghost
├── pipeline.py                   # Orchestrator: runs all 3 stages in sequence
├── config.py                     # Shared configuration (Ghost URL, brand colors, etc.)
├── templates/
│   └── article_prompt.txt        # System prompt template for article generation
├── fonts/
│   ├── SpaceGrotesk-Variable.woff2   # Heading font for thumbnails
│   └── Inter-Variable.woff2          # Body font (if needed)
├── articles/                     # Generated article markdown files
│   ├── procurement-act-2023-guide.md
│   ├── how-to-find-uk-tenders.md
│   └── ...
├── thumbnails/                   # Generated thumbnail images
│   ├── procurement-act-2023-guide.png
│   └── ...
└── output/                       # Published article metadata (JSON)
    └── published.json
```

### Pattern 1: Ghost Admin API Authentication (Python JWT)

**What:** Ghost Admin API uses HS256 JWT tokens generated from an Admin API key. The key format is `{id}:{secret}` where the secret is hex-encoded.

**When to use:** Every Ghost Admin API call requires this authentication.

**Example:**

```python
# Source: Ghost Admin API docs (Context7 /llmstxt/ghost_llms-full_txt)
import jwt
import requests
from datetime import datetime

def get_ghost_jwt(admin_api_key: str) -> str:
    """Generate a Ghost Admin API JWT token from an API key."""
    id, secret = admin_api_key.split(':')
    iat = int(datetime.now().timestamp())
    header = {'alg': 'HS256', 'typ': 'JWT', 'kid': id}
    payload = {
        'iat': iat,
        'exp': iat + 5 * 60,  # 5 minute expiry
        'aud': '/admin/'
    }
    return jwt.encode(payload, bytes.fromhex(secret), algorithm='HS256', headers=header)

def ghost_headers(admin_api_key: str) -> dict:
    """Return authorization headers for Ghost Admin API."""
    token = get_ghost_jwt(admin_api_key)
    return {
        'Authorization': f'Ghost {token}',
        'Content-Type': 'application/json',
        'Accept-Version': 'v5.0'
    }
```

### Pattern 2: HTML Content with Lossless kg-card Wrapper

**What:** Ghost can convert HTML to Lexical via `?source=html`. For lossless conversion (HTML preserved verbatim), wrap content in `<!--kg-card-begin: html-->` and `<!--kg-card-end: html-->` comments. Ghost stores this as an HTML card in Lexical, rendering the original HTML unchanged.

**When to use:** Always for pipeline-generated content. Ensures the rendered blog post matches exactly what the pipeline produced.

**Example:**

```python
# Source: Ghost Admin API docs - Creating a Post > Source HTML
import markdown

def markdown_to_ghost_html(md_content: str) -> str:
    """Convert markdown to HTML wrapped in Ghost HTML card for lossless Lexical conversion."""
    # Convert markdown to HTML
    html = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'codehilite', 'toc', 'attr_list']
    )
    # Wrap in kg-card for lossless Lexical storage
    return f"<!--kg-card-begin: html-->\n{html}\n<!--kg-card-end: html-->"
```

### Pattern 3: Complete Post Creation with Feature Image

**What:** Upload the featured image first via `/admin/images/upload/`, get back the URL, then create the post with `feature_image` set to that URL.

**When to use:** Every article published via the pipeline.

**Example:**

```python
# Source: Ghost Admin API docs (Context7 verified)
import requests
import json

GHOST_URL = "https://ghost-admin.tendhunt.com"

def upload_image(filepath: str, admin_api_key: str) -> str:
    """Upload an image to Ghost and return its URL."""
    token = get_ghost_jwt(admin_api_key)
    headers = {'Authorization': f'Ghost {token}'}
    with open(filepath, 'rb') as f:
        files = {'file': (filepath.split('/')[-1], f, 'image/png')}
        data = {'purpose': 'image', 'ref': filepath.split('/')[-1]}
        resp = requests.post(
            f"{GHOST_URL}/ghost/api/admin/images/upload/",
            headers=headers,
            files=files,
            data=data
        )
    resp.raise_for_status()
    return resp.json()['images'][0]['url']

def create_post(
    title: str,
    html: str,
    feature_image_url: str,
    tags: list[str],
    meta_description: str,
    custom_excerpt: str,
    slug: str,
    admin_api_key: str,
    status: str = "draft"
) -> dict:
    """Create a Ghost post via Admin API with HTML source conversion."""
    headers = ghost_headers(admin_api_key)
    body = {
        "posts": [{
            "title": title,
            "html": html,
            "status": status,
            "feature_image": feature_image_url,
            "tags": tags,
            "meta_description": meta_description,
            "custom_excerpt": custom_excerpt,
            "slug": slug,
        }]
    }
    resp = requests.post(
        f"{GHOST_URL}/ghost/api/admin/posts/?source=html",
        headers=headers,
        json=body
    )
    resp.raise_for_status()
    return resp.json()['posts'][0]
```

### Pattern 4: Pillow Branded Thumbnail Generation

**What:** Generate 1200x630 PNG thumbnails matching the TendHunt brand: dark background (#0A0A0A), accent color (#E5FF00), Space Grotesk heading text, subtle gradient or geometric elements.

**When to use:** For every article's featured image.

**Example:**

```python
# Source: Pillow docs (Context7 /python-pillow/pillow)
from PIL import Image, ImageDraw, ImageFont
import textwrap

# TendHunt brand constants
BG_COLOR = (10, 10, 10)          # #0A0A0A
ACCENT_COLOR = (229, 255, 0)     # #E5FF00
TEXT_COLOR = (255, 255, 255)     # White
SECONDARY_TEXT = (161, 161, 161) # #A1A1A1
WIDTH, HEIGHT = 1200, 630

def generate_thumbnail(
    title: str,
    tag: str,
    output_path: str,
    font_path: str = "fonts/SpaceGrotesk-Variable.woff2"
) -> None:
    """Generate a branded TendHunt blog thumbnail."""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Draw accent bar at top
    draw.rectangle([(0, 0), (WIDTH, 6)], fill=ACCENT_COLOR)

    # Draw subtle grid pattern (brand element)
    for x in range(0, WIDTH, 40):
        draw.line([(x, 0), (x, HEIGHT)], fill=(20, 20, 20), width=1)
    for y in range(0, HEIGHT, 40):
        draw.line([(0, y), (WIDTH, y)], fill=(20, 20, 20), width=1)

    # Load fonts (use TTF version for Pillow - woff2 not supported)
    try:
        title_font = ImageFont.truetype("fonts/SpaceGrotesk-Bold.ttf", 52)
        tag_font = ImageFont.truetype("fonts/Inter-Regular.ttf", 20)
        brand_font = ImageFont.truetype("fonts/SpaceGrotesk-Bold.ttf", 24)
    except OSError:
        title_font = ImageFont.load_default(size=52)
        tag_font = ImageFont.load_default(size=20)
        brand_font = ImageFont.load_default(size=24)

    # Draw tag pill
    tag_text = tag.upper()
    draw.rounded_rectangle(
        [(60, 80), (60 + len(tag_text) * 14 + 24, 115)],
        radius=4,
        fill=ACCENT_COLOR
    )
    draw.text((72, 85), tag_text, fill=BG_COLOR, font=tag_font)

    # Draw title (wrapped)
    wrapped = textwrap.fill(title, width=30)
    draw.multiline_text(
        (60, 140),
        wrapped,
        fill=TEXT_COLOR,
        font=title_font,
        spacing=12
    )

    # Draw brand name bottom-left
    draw.text((60, HEIGHT - 70), "TendHunt", fill=ACCENT_COLOR, font=brand_font)
    draw.text((180, HEIGHT - 70), "tendhunt.com/blog", fill=SECONDARY_TEXT, font=tag_font)

    # Draw accent dot
    draw.ellipse([(WIDTH - 100, HEIGHT - 100), (WIDTH - 60, HEIGHT - 60)], fill=ACCENT_COLOR)

    img.save(output_path, 'PNG', optimize=True)
```

### Pattern 5: AI Article Generation with Structured Output

**What:** Use OpenAI GPT-4o to generate SEO-optimized article markdown with frontmatter metadata.

**When to use:** For generating the initial draft of each article.

**Example:**

```python
# Source: OpenAI Python SDK docs (Context7 /openai/openai-python)
from openai import OpenAI
import yaml

client = OpenAI()  # reads OPENAI_API_KEY from env

SYSTEM_PROMPT = """You are an expert content writer specializing in UK public sector procurement.
Write authoritative, data-driven articles targeting suppliers who want to win government contracts.

Article requirements:
- 1500-2500 words
- Include specific UK procurement statistics and references
- Reference the Procurement Act 2023 where relevant
- Use clear H2/H3 heading structure
- Include actionable advice for suppliers
- Professional, analytical tone (not salesy)
- Include a compelling introduction and clear conclusion
- Use British English spelling

Output format: Return a markdown document with YAML frontmatter:
---
title: "Article Title"
slug: "article-slug"
meta_description: "155 character meta description for SEO"
excerpt: "Short excerpt for post cards"
tags: ["tag1", "tag2"]
---

[Article body in markdown]
"""

def generate_article(topic: str, keywords: list[str]) -> str:
    """Generate an SEO-optimized article on a UK procurement topic."""
    user_prompt = f"""Write an article about: {topic}

Target SEO keywords: {', '.join(keywords)}

The article should help UK suppliers understand and act on this topic.
Include real statistics, framework references, and practical steps."""

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=4000,
    )
    return completion.choices[0].message.content
```

### Anti-Patterns to Avoid

- **Do NOT generate Lexical JSON directly:** Lexical's internal format is complex, versioned, and underdocumented for external use. Use `?source=html` with kg-card wrapper instead. Ghost handles the conversion.
- **Do NOT publish articles as "published" immediately:** Always create as "draft" first. Review in Ghost editor, then publish manually or via a second API call. This prevents SEO-damaging typos or formatting issues.
- **Do NOT hardcode Ghost API keys in scripts:** Use `.env` file with `python-dotenv`. API keys should never be committed to git.
- **Do NOT skip the `Accept-Version` header:** Ghost Admin API requires versioning. Without it, behavior may change between Ghost updates.
- **Do NOT use DALL-E 2/3 for image generation:** These models are deprecated (end of support 2026-05-12). Use `gpt-image-1` or `gpt-image-1.5` if using OpenAI for images, or stick with Pillow.
- **Do NOT generate thumbnails as JPEG without transparency check:** Ghost handles responsive resizing. Upload as PNG (lossless) at 1200x630 -- Ghost will create responsive variants.
- **Do NOT use `woff2` fonts directly in Pillow:** Pillow does not support woff2 format. Download TTF versions of Space Grotesk and Inter for thumbnail generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT token generation for Ghost | Custom HMAC signing code | `PyJWT` with `bytes.fromhex(secret)` | Ghost uses a specific JWT format (kid in header, /admin/ audience). PyJWT handles all edge cases. |
| Markdown to HTML conversion | Regex-based markdown parser | `markdown` library with extensions | Markdown spec has 600+ edge cases. Library handles tables, fenced code, TOC, attributes correctly. |
| HTML to Lexical conversion | Custom Lexical JSON builder | Ghost's `?source=html` endpoint | Lexical internal format is versioned and complex. Ghost converts HTML natively -- let it. |
| Image resizing/optimization | Custom Sharp/ImageMagick calls | Upload full-size to Ghost, let Ghost handle responsive images | Ghost auto-generates responsive srcset at multiple breakpoints based on theme config. |
| SEO slug generation | Manual string replacement | `python-slugify` | Handles Unicode, special characters, consecutive hyphens, max length. One-liner. |
| Article file management | Custom JSON/database | YAML frontmatter in markdown files | Human-readable, version-controllable, parseable with `python-frontmatter`. Industry standard for static content. |

**Key insight:** The entire pipeline should be "boring technology" -- well-tested libraries doing simple transformations. The value is in the content (topics, quality, SEO targeting), not in custom infrastructure.

---

## Common Pitfalls

### Pitfall 1: Ghost JWT Token Expiry During Batch Operations

**What goes wrong:** When publishing 10+ articles in sequence, the JWT token expires mid-batch (tokens have 5-minute lifetime) and subsequent API calls return 401 Unauthorized.

**Why it happens:** The token is generated once at script start and reused for all requests. Ghost's JWT tokens expire after `exp` claim (typically 5 minutes).

**How to avoid:** Generate a fresh token for each API call, or implement a token refresh mechanism that checks remaining lifetime before each request. The `get_ghost_jwt()` function should be called per-request, not cached globally.

**Warning signs:** First few articles publish successfully, then 401 errors start appearing.

### Pitfall 2: Ghost HTML Source Conversion Is Lossy (Without kg-card)

**What goes wrong:** Article HTML is sent via `?source=html` without the kg-card wrapper. Ghost converts it to Lexical, but the rendered output differs from the input -- custom classes are stripped, complex tables break, code block language annotations are lost.

**Why it happens:** Ghost's HTML-to-Lexical converter maps HTML to Lexical nodes. Not all HTML constructs have Lexical equivalents. The conversion is "best effort" and documented as lossy.

**How to avoid:** ALWAYS wrap pipeline-generated HTML in `<!--kg-card-begin: html-->` and `<!--kg-card-end: html-->` comments. Ghost stores this as a verbatim HTML card -- zero conversion loss.

**Warning signs:** Articles look different in the Ghost editor than expected. Formatting breaks, classes are missing, tables render incorrectly.

### Pitfall 3: Pillow Cannot Load woff2 Fonts

**What goes wrong:** `ImageFont.truetype("SpaceGrotesk-Variable.woff2", 52)` throws `OSError: cannot open resource`. Thumbnail generation fails.

**Why it happens:** Pillow uses FreeType under the hood, which supports TTF and OTF but NOT woff2 (web-only compressed format). The project's fonts are in woff2 for web use.

**How to avoid:** Download TTF versions of Space Grotesk and Inter specifically for Pillow. Google Fonts provides TTF downloads. Alternatively, use the `fonttools` library to convert woff2 to TTF.

**Warning signs:** Font loading errors in thumbnail generation. Fallback to default bitmap font produces ugly text.

### Pitfall 4: Ghost Feature Image URL Must Be Absolute

**What goes wrong:** After uploading an image via `/admin/images/upload/`, the response returns a URL like `https://ghost-admin.tendhunt.com/content/images/2026/02/thumbnail.png`. This is set as `feature_image` on the post. But on the public blog at `tendhunt.com/blog`, the image 404s because the Cloudflare Worker rewrites HTML URLs but not the feature_image field in API responses.

**Why it happens:** Ghost stores `feature_image` as the full URL from its own domain. The Cloudflare Worker rewrites URLs in rendered HTML (img src attributes), but the raw API response contains the Ghost origin URL.

**How to avoid:** This is actually NOT a problem in practice -- Ghost renders the feature_image in the HTML template using `{{feature_image}}`, which outputs the Ghost origin URL. The Cloudflare Worker's HTMLRewriter catches this `<img src=...>` and rewrites it to the public domain. The feature image will work correctly through the proxy. Just upload normally and let the proxy handle rewriting.

**Warning signs:** None expected -- this pitfall is a non-issue due to the Worker proxy architecture already in place.

### Pitfall 5: OpenAI Article Length Inconsistency

**What goes wrong:** Prompt asks for 1500-2500 words but GPT-4o generates 800-word articles or 4000-word articles inconsistently.

**Why it happens:** Token limits (max_tokens) don't map directly to word counts. The model may truncate early or pad content depending on topic complexity and prompt specifics.

**How to avoid:** Set `max_tokens=4000` (gives ~3000 words of headroom). Add explicit word count guidance in the system prompt: "The article MUST be between 1500 and 2500 words." After generation, validate word count and regenerate if outside bounds. Use `temperature=0.7` for consistent but creative output.

**Warning signs:** Articles are noticeably shorter than expected. Content feels rushed or repetitive. Word count varies wildly between articles.

### Pitfall 6: Missing Ghost Admin API Key

**What goes wrong:** Script fails with authentication error because no Admin API key has been created in Ghost.

**Why it happens:** Ghost Admin API keys must be manually created via the Ghost admin panel (Settings > Integrations > Custom Integrations). This is a one-time setup step that's easy to overlook.

**How to avoid:** Before running the pipeline: (1) Go to `ghost-admin.tendhunt.com/ghost/#/settings/integrations`, (2) Click "Add custom integration", (3) Name it "Content Pipeline", (4) Copy the Admin API Key (format: `{id}:{secret}`), (5) Save to `.env` as `GHOST_ADMIN_KEY`.

**Warning signs:** 401 Unauthorized on all Ghost API calls. JWT generation succeeds but API rejects the token.

---

## Code Examples

### Complete Pipeline Orchestrator

```python
# pipeline.py -- Source: Research synthesis of Ghost Admin API + OpenAI + Pillow patterns
import os
import json
import frontmatter
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from generate_articles import generate_article
from generate_thumbnails import generate_thumbnail
from publish_to_ghost import upload_image, create_post, markdown_to_ghost_html

GHOST_ADMIN_KEY = os.environ['GHOST_ADMIN_KEY']
ARTICLES_DIR = Path('articles')
THUMBNAILS_DIR = Path('thumbnails')
OUTPUT_DIR = Path('output')

# Article topics for UK procurement SEO
TOPICS = [
    {
        "topic": "Complete Guide to the UK Procurement Act 2023 for Suppliers",
        "keywords": ["Procurement Act 2023", "UK procurement reform", "supplier guide", "public sector contracts"],
        "tags": ["Procurement Act 2023", "UK Procurement", "Supplier Guide"],
    },
    {
        "topic": "How to Find and Win UK Government Tenders in 2026",
        "keywords": ["find government tenders UK", "win government contracts", "Find a Tender service", "public procurement"],
        "tags": ["Government Tenders", "UK Procurement", "How To"],
    },
    # ... more topics
]

def run_pipeline():
    """Run the full content generation pipeline."""
    published = []

    for topic_config in TOPICS:
        print(f"\n--- Generating: {topic_config['topic']} ---")

        # Stage 1: Generate article
        article_md = generate_article(topic_config['topic'], topic_config['keywords'])
        post = frontmatter.loads(article_md)

        slug = post.metadata.get('slug', 'untitled')
        article_path = ARTICLES_DIR / f"{slug}.md"
        article_path.write_text(article_md)
        print(f"  Article saved: {article_path}")

        # Stage 2: Generate thumbnail
        thumb_path = THUMBNAILS_DIR / f"{slug}.png"
        generate_thumbnail(
            title=post.metadata['title'],
            tag=topic_config['tags'][0],
            output_path=str(thumb_path)
        )
        print(f"  Thumbnail saved: {thumb_path}")

        # Stage 3: Publish to Ghost (as draft)
        feature_image_url = upload_image(str(thumb_path), GHOST_ADMIN_KEY)
        html_content = markdown_to_ghost_html(post.content)
        ghost_post = create_post(
            title=post.metadata['title'],
            html=html_content,
            feature_image_url=feature_image_url,
            tags=topic_config['tags'],
            meta_description=post.metadata.get('meta_description', ''),
            custom_excerpt=post.metadata.get('excerpt', ''),
            slug=slug,
            admin_api_key=GHOST_ADMIN_KEY,
            status="draft"  # Always draft first for review
        )
        print(f"  Published as draft: {ghost_post['url']}")
        published.append({
            'slug': slug,
            'ghost_id': ghost_post['id'],
            'ghost_url': ghost_post['url'],
            'status': 'draft'
        })

    # Save published metadata
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / 'published.json').write_text(json.dumps(published, indent=2))
    print(f"\nPipeline complete. {len(published)} articles created as drafts.")

if __name__ == '__main__':
    ARTICLES_DIR.mkdir(exist_ok=True)
    THUMBNAILS_DIR.mkdir(exist_ok=True)
    run_pipeline()
```

### Ghost Admin Integration Creation (One-Time Setup)

```bash
# Create API integration via Ghost Admin panel:
# 1. Navigate to ghost-admin.tendhunt.com/ghost/#/settings/integrations
# 2. Click "Add custom integration"
# 3. Name: "Content Pipeline"
# 4. Copy the Admin API Key (format: 64char_hex_id:64char_hex_secret)
# 5. Store in .env:

# .env file
GHOST_URL=https://ghost-admin.tendhunt.com
GHOST_ADMIN_KEY=your_integration_id:your_integration_secret
OPENAI_API_KEY=sk-proj-your-openai-key
```

### Ghost Post Fields Reference (All Settable via Admin API)

```python
# Source: Ghost Admin API docs (Context7 /llmstxt/ghost_llms-full_txt)
# Full list of fields settable when creating a post:
post_fields = {
    "title": "string (required)",
    "slug": "string - URL slug",
    "html": "string - content (with ?source=html)",
    "lexical": "string - content in Lexical JSON",
    "status": "string - draft|published|scheduled",
    "feature_image": "string - URL of featured image",
    "feature_image_alt": "string - alt text for featured image",
    "feature_image_caption": "string - caption for featured image",
    "featured": "boolean - pin to top",
    "tags": "array - tag names or objects",
    "authors": "array - author emails or objects",
    "custom_excerpt": "string - custom excerpt for cards/feeds",
    "meta_title": "string - SEO title (if different from title)",
    "meta_description": "string - SEO description (155 chars max)",
    "og_image": "string - Open Graph image URL",
    "og_title": "string - Open Graph title",
    "og_description": "string - Open Graph description",
    "twitter_image": "string - Twitter Card image URL",
    "twitter_title": "string - Twitter Card title",
    "twitter_description": "string - Twitter Card description",
    "canonical_url": "string - canonical URL override",
    "custom_template": "string - custom theme template",
    "published_at": "datetime - schedule publishing",
    "visibility": "string - public|members|paid|tiers",
}
```

---

## SEO Article Topics (Recommended for Launch)

Based on research of UK procurement keywords and competitor content (Tussell, TenderEyes, GOV.UK guides):

| # | Article Topic | Primary Keywords | Search Intent | Priority |
|---|---|---|---|---|
| 1 | Complete Guide to the Procurement Act 2023 for Suppliers | Procurement Act 2023, UK procurement reform | Informational | HIGH |
| 2 | How to Find UK Government Tenders in 2026 | find government tenders UK, Find a Tender service | Navigational/How-to | HIGH |
| 3 | 8 Public Sector Tender Portals Every Supplier Must Track | tender portals UK, Contracts Finder, G-Cloud | Listicle | HIGH |
| 4 | Understanding UK Government Procurement Frameworks | procurement frameworks UK, CCS, Crown Commercial | Informational | MEDIUM |
| 5 | How Small Businesses Can Win Government Contracts | SME government contracts UK, small business tenders | How-to | HIGH |
| 6 | What is Buyer Intelligence in Public Procurement? | buyer intelligence, procurement contacts | Informational (product-aligned) | MEDIUM |
| 7 | UK Public Procurement Statistics: Market Size and Trends | UK procurement spend, public sector market size | Data/Research | MEDIUM |
| 8 | How to Write a Winning Tender Response | tender writing tips, bid writing guide UK | How-to | HIGH |
| 9 | CPV Codes Explained: How to Find the Right Procurement Category | CPV codes, procurement categories | How-to | MEDIUM |
| 10 | Procurement Act 2023 Timeline: What Changed and When | Procurement Act timeline, procurement reform dates | Informational | LOW |

**Tag Taxonomy:**
- `uk-procurement` -- broad category for all articles
- `procurement-act-2023` -- articles specifically about the new Act
- `government-tenders` -- how-to content about finding/winning tenders
- `supplier-guide` -- practical guides for suppliers
- `procurement-data` -- data-driven, statistics-focused articles
- `buyer-intelligence` -- product-aligned content

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ghost mobiledoc format | Ghost Lexical format | Ghost 5.0 (2023) | All new content MUST use Lexical. `?source=html` converts automatically. |
| Direct Lexical JSON generation | `?source=html` with kg-card wrapper | Always available | Lossless HTML-to-Lexical conversion without building Lexical JSON manually. |
| DALL-E 3 for AI images | GPT Image 1.5 (`gpt-image-1.5`) | Late 2025 | DALL-E 2/3 deprecated (end 2026-05-12). GPT Image 1.5 is current. |
| Manual article writing | AI-assisted generation + human review | 2024-2025 | GPT-4o produces publication-ready drafts. Human review still essential for accuracy. |
| `ghost-admin-api` JS SDK | Python `requests` + `PyJWT` | N/A | Ghost only has JS SDK. Python approach uses raw HTTP -- equally capable, matches user's existing workflow. |

**Deprecated/outdated:**
- **DALL-E 2 and DALL-E 3** -- Support ends 2026-05-12. Migrate to GPT Image family.
- **Ghost mobiledoc format** -- Replaced by Lexical in Ghost 5.0. Cannot be used for new posts.
- **Ghost Content API for writing** -- Content API is read-only. Must use Admin API for creating/editing posts.

---

## Thumbnail Generation: Detailed Approach

### Recommendation: Pillow Branded Templates

For the 5-10 launch articles, use Pillow-generated branded thumbnails. This approach:
- Costs $0 (no API calls)
- Runs instantly (no network latency)
- Guarantees brand consistency (exact colors, fonts, layout)
- Is deterministic (same input = same output)
- Matches the user's existing workflow (`generate_getmany_thumbnail_simple.py` from Getmany project)

### Thumbnail Specifications

| Property | Value | Reason |
|----------|-------|--------|
| **Dimensions** | 1200 x 630 px | Standard OG image / blog featured image. Ghost generates responsive variants from this. |
| **Format** | PNG | Lossless quality for upload. Ghost handles compression/resizing. |
| **Background** | #0A0A0A with subtle grid lines (#141414) | Matches TendHunt dark theme |
| **Accent bar** | 6px #E5FF00 at top | Brand accent |
| **Title** | Space Grotesk Bold, 52px, white, max 3 lines | Readable, on-brand |
| **Tag pill** | #E5FF00 background, dark text, 20px | Shows article category |
| **Brand mark** | "TendHunt" in #E5FF00, bottom-left | Attribution |

### Alternative: GPT Image for Unique Illustrations

If the user wants unique per-article illustrations (not just text-on-brand templates), use OpenAI GPT Image:

```python
# Optional: AI-generated thumbnail illustrations
from openai import OpenAI
import base64

client = OpenAI()

def generate_ai_thumbnail(article_title: str, output_path: str):
    """Generate a unique AI illustration for an article thumbnail."""
    result = client.images.generate(
        model="gpt-image-1",  # or gpt-image-1.5 for higher quality
        prompt=f"""Create a professional blog featured image for an article titled "{article_title}".
Style: Dark background (#0A0A0A), minimalist, geometric elements, accent color lime/yellow (#E5FF00).
Must include subtle UK government/procurement visual elements.
Clean, modern, enterprise SaaS aesthetic. No text in the image.""",
        size="1024x1024",
        quality="medium",
    )
    image_bytes = base64.b64decode(result.data[0].b64_json)
    with open(output_path, 'wb') as f:
        f.write(image_bytes)
```

**Cost:** ~$0.04/image (medium quality) or ~$0.08/image (high quality). For 10 articles = $0.40-$0.80 total.

---

## Open Questions

1. **Ghost Admin API Key -- Does One Exist Yet?**
   - What we know: Ghost 6.18.0 is running at ghost-admin.tendhunt.com. Admin panel is accessible. Credentials stored at `/root/.ghost_admin_credentials` on VPS.
   - What's unclear: Whether a Custom Integration has been created in Ghost admin to generate an Admin API key.
   - Recommendation: Pipeline Plan 04-01 should include a setup task to create the Ghost Admin integration and store the API key in `.env`.

2. **TTF Font Files for Pillow**
   - What we know: The project uses woff2 fonts (web format). Pillow requires TTF format.
   - What's unclear: Whether TTF versions of Space Grotesk and Inter are available locally.
   - Recommendation: Download TTF versions from Google Fonts (Space Grotesk: fonts.google.com/specimen/Space+Grotesk, Inter: fonts.google.com/specimen/Inter). Store in `content-pipeline/fonts/`.

3. **Article Review Workflow**
   - What we know: Articles should be AI-generated, human-reviewed, then published. Pipeline creates drafts.
   - What's unclear: Who reviews? What's the turnaround expectation? Is there a batch publish step?
   - Recommendation: Pipeline creates all articles as "draft". User reviews in Ghost editor (ghost-admin.tendhunt.com/ghost). A separate `publish_drafts.py` script can bulk-publish approved drafts via API.

4. **Internal Linking Between Articles**
   - What we know: Success criteria mentions "internal links". Articles should link to each other and to the landing page.
   - What's unclear: How to handle internal links when articles are generated independently (article A can't link to article B if B doesn't exist yet).
   - Recommendation: Generate all articles first without internal links. After all drafts are created, run a post-processing step that adds internal links based on keyword/topic matching and known slugs.

---

## Sources

### Primary (HIGH confidence)

- **Context7 `/llmstxt/ghost_llms-full_txt`** -- Ghost Admin API: post creation (Lexical + HTML source), JWT authentication, image upload, all post fields
- **Context7 `/websites/ghost`** -- Ghost Lexical format, post object structure, API field reference
- **Context7 `/python-pillow/pillow`** -- ImageDraw text rendering, ImageFont TrueType loading, thumbnail generation
- **Context7 `/openai/openai-python`** -- Chat completions API, message format, model parameter
- **Context7 `/websites/platform_openai`** -- Image generation API (GPT Image 1.5), sizes, quality, pricing, DALL-E deprecation
- [Ghost Admin API: Creating a Post](https://docs.ghost.org/admin-api/posts/creating-a-post) -- `?source=html`, kg-card lossless wrapper, post fields
- [Ghost Admin API: Images Upload](https://docs.ghost.org/admin-api) -- `POST /admin/images/upload/`, multipart form data, purpose parameter

### Secondary (MEDIUM confidence)

- [Pillow: Using Pillow to generate images programmatically](https://www.slingacademy.com/article/python-using-pillow-to-generate-images-programmatically/) -- Full generation examples
- [Ghost Forum: How to Create a Post via API](https://forum.ghost.org/t/how-to-create-a-post-via-api-url-parameters-and-requirements/49501) -- Community-verified API patterns
- [TryGhost/api-demos on GitHub](https://github.com/TryGhost/api-demos) -- Official demo scripts for Admin API usage
- [Tussell: How to Find Government Tenders](https://www.tussell.com/insights/how-to-find-tenders-and-contracts) -- UK procurement keyword research
- [Tussell: 8 Public Sector Tender Portals](https://www.tussell.com/insights/8-public-sector-tender-portals-you-need-to-track) -- Competitor content analysis
- [GOV.UK: Procurement Act 2023 Supplier Guide](https://www.gov.uk/government/publications/procurement-act-2023-short-guides/the-procurement-act-2023-a-short-guide-for-suppliers-html) -- Authoritative topic reference
- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation) -- GPT Image models, deprecation schedule

### Tertiary (LOW confidence)

- [MD2Ghost: Publish Markdown to Ghost CMS](https://github.com/MirisWisdom/MD2Ghost) -- Existing tool for markdown-to-Ghost publishing (not used, but validates the markdown pipeline approach)
- [n8n Ghost HTML-to-Lexical Node](https://community.n8n.io/t/a-ghost-node-for-working-with-html-and-lexical/155105) -- Community automation tool (validates that HTML-to-Lexical conversion is a common pattern)

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH -- Ghost Admin API verified via Context7 with official code examples. OpenAI SDK verified via Context7. Pillow verified via Context7.
- **Architecture patterns:** HIGH -- kg-card lossless wrapper documented in official Ghost docs. JWT auth pattern from official Python examples. Pipeline structure follows user's existing Getmany workflow.
- **Pitfalls:** HIGH -- JWT expiry, lossy vs lossless HTML, woff2 font limitation all verified via official documentation. Feature image URL rewriting verified against the existing Cloudflare Worker architecture from Phase 3.
- **SEO topics:** MEDIUM -- Keyword targets based on WebSearch of competitor content (Tussell, GOV.UK). Actual search volume not verified with SEO tools. Topics may need adjustment after keyword research.
- **Thumbnail generation:** HIGH for Pillow approach (verified via Context7 docs). MEDIUM for GPT Image approach (pricing verified but brand consistency unverified in practice).

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- Ghost API and OpenAI SDK are stable; GPT Image models evolving)

---
*Phase: 04-content-pipeline*
*Research completed: 2026-02-11*
