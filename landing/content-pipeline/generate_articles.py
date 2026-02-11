"""Stage 1: AI article generation using Anthropic Claude.

Generates SEO-optimised markdown articles with YAML frontmatter
targeting UK public procurement keywords.

Usage:
    python generate_articles.py "topic" "kw1,kw2" "tag1,tag2"
"""

import sys
from pathlib import Path

import anthropic
from slugify import slugify
from dotenv import load_dotenv

load_dotenv()

from config import ANTHROPIC_API_KEY, TEMPLATES_DIR, ARTICLES_DIR

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Load system prompt from template
SYSTEM_PROMPT_PATH = TEMPLATES_DIR / "article_prompt.txt"

# Model to use for article generation
MODEL = "claude-sonnet-4-5-20250929"


def _load_system_prompt() -> str:
    """Load the system prompt from the template file."""
    if SYSTEM_PROMPT_PATH.exists():
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    raise FileNotFoundError(f"System prompt not found at {SYSTEM_PROMPT_PATH}")


def generate_article(
    topic: str,
    keywords: list[str],
    tags: list[str],
) -> str:
    """Generate an SEO-optimised article on a UK procurement topic.

    Args:
        topic: The article topic / title idea.
        keywords: Target SEO keywords for the article.
        tags: Tags to include in the frontmatter.

    Returns:
        Full markdown string with YAML frontmatter.
    """
    system_prompt = _load_system_prompt()

    user_prompt = (
        f"Write an article about: {topic}\n\n"
        f"Target SEO keywords: {', '.join(keywords)}\n\n"
        f"Tags to use in frontmatter: {', '.join(tags)}\n\n"
        "The article should help UK suppliers understand and act on this topic. "
        "Include real statistics, framework references, and practical steps."
    )

    message = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
        system=system_prompt,
        temperature=0.7,
    )

    article_md = message.content[0].text

    # Validate output has frontmatter (starts with "---")
    if not article_md.strip().startswith("---"):
        print("  WARNING: Missing frontmatter, regenerating once...")
        message = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            messages=[
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": article_md},
                {
                    "role": "user",
                    "content": (
                        "Your response is missing the YAML frontmatter block. "
                        "Please regenerate the complete article starting with "
                        "--- on the first line, followed by YAML metadata, "
                        "then --- to close, then the markdown body."
                    ),
                },
            ],
            system=system_prompt,
            temperature=0.7,
        )
        article_md = message.content[0].text

    return article_md


def _extract_slug(article_md: str, fallback_topic: str) -> str:
    """Extract slug from frontmatter or generate from topic."""
    for line in article_md.split("\n"):
        stripped = line.strip()
        if stripped.startswith("slug:"):
            slug_val = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            if slug_val:
                return slug_val
    return slugify(fallback_topic)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_articles.py <topic> [keywords] [tags]")
        print('  Example: python generate_articles.py "How to Find UK Tenders" "uk tenders,government contracts" "UK Procurement,How To"')
        sys.exit(1)

    topic = sys.argv[1]
    keywords = sys.argv[2].split(",") if len(sys.argv) > 2 else []
    tags = sys.argv[3].split(",") if len(sys.argv) > 3 else []

    print(f"Generating article: {topic}")
    article = generate_article(topic, keywords, tags)

    slug = _extract_slug(article, topic)
    output_path = ARTICLES_DIR / f"{slug}.md"
    output_path.write_text(article, encoding="utf-8")
    print(f"Article saved to: {output_path}")
