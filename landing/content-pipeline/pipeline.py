"""Content pipeline orchestrator.

Runs all 3 stages in sequence: generate articles, create thumbnails,
publish to Ghost as drafts.

Usage:
    python pipeline.py                  # Full run (generate + publish all)
    python pipeline.py --generate-only  # Only generate articles + thumbnails
    python pipeline.py --publish-only   # Only publish existing files to Ghost
"""

import argparse
import json
import sys
from pathlib import Path

import frontmatter
from dotenv import load_dotenv

load_dotenv()

from config import ARTICLES_DIR, GHOST_ADMIN_KEY, OUTPUT_DIR, THUMBNAILS_DIR
from generate_articles import generate_article
from generate_thumbnails import generate_thumbnail
from publish_to_ghost import publish_article

# === SEO Article Topics (from 04-RESEARCH.md) ===
TOPICS = [
    {
        "topic": "Complete Guide to the Procurement Act 2023 for Suppliers",
        "keywords": [
            "Procurement Act 2023",
            "UK procurement reform",
            "supplier guide",
            "public sector contracts",
        ],
        "tags": ["Procurement Act 2023", "UK Procurement", "Supplier Guide"],
    },
    {
        "topic": "How to Find UK Government Tenders in 2026",
        "keywords": [
            "find government tenders UK",
            "win government contracts",
            "Find a Tender service",
            "public procurement",
        ],
        "tags": ["Government Tenders", "UK Procurement", "How To"],
    },
    {
        "topic": "8 Public Sector Tender Portals Every Supplier Must Track",
        "keywords": [
            "tender portals UK",
            "Contracts Finder",
            "G-Cloud",
            "public sector tenders",
        ],
        "tags": ["Government Tenders", "Tender Portals", "UK Procurement"],
    },
    {
        "topic": "Understanding UK Government Procurement Frameworks",
        "keywords": [
            "procurement frameworks UK",
            "CCS",
            "Crown Commercial Service",
            "framework agreements",
        ],
        "tags": ["UK Procurement", "Procurement Frameworks", "Supplier Guide"],
    },
    {
        "topic": "How Small Businesses Can Win Government Contracts",
        "keywords": [
            "SME government contracts UK",
            "small business tenders",
            "procurement for SMEs",
            "win public contracts",
        ],
        "tags": ["SME Guide", "Government Tenders", "UK Procurement"],
    },
    {
        "topic": "What is Buyer Intelligence in Public Procurement?",
        "keywords": [
            "buyer intelligence",
            "procurement contacts",
            "procurement decision makers",
            "public sector buyers",
        ],
        "tags": ["Buyer Intelligence", "UK Procurement", "Procurement Data"],
    },
    {
        "topic": "UK Public Procurement Statistics: Market Size and Trends",
        "keywords": [
            "UK procurement spend",
            "public sector market size",
            "procurement statistics UK",
            "government spending data",
        ],
        "tags": ["Procurement Data", "UK Procurement", "Market Analysis"],
    },
    {
        "topic": "How to Write a Winning Tender Response",
        "keywords": [
            "tender writing tips",
            "bid writing guide UK",
            "winning tender response",
            "procurement bid writing",
        ],
        "tags": ["Supplier Guide", "Government Tenders", "How To"],
    },
    {
        "topic": "CPV Codes Explained: How to Find the Right Procurement Category",
        "keywords": [
            "CPV codes",
            "procurement categories",
            "CPV code lookup",
            "common procurement vocabulary",
        ],
        "tags": ["UK Procurement", "Supplier Guide", "How To"],
    },
    {
        "topic": "Procurement Act 2023 Timeline: What Changed and When",
        "keywords": [
            "Procurement Act timeline",
            "procurement reform dates",
            "Procurement Act 2023 implementation",
            "UK procurement changes",
        ],
        "tags": ["Procurement Act 2023", "UK Procurement", "Procurement Data"],
    },
]


def _extract_slug(article_md: str, fallback_topic: str) -> str:
    """Extract slug from frontmatter or generate from topic."""
    from slugify import slugify

    for line in article_md.split("\n"):
        stripped = line.strip()
        if stripped.startswith("slug:"):
            slug_val = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            if slug_val:
                return slug_val
    return slugify(fallback_topic)


def run_pipeline(
    topics: list[dict] | None = None,
    generate_only: bool = False,
    publish_only: bool = False,
) -> list[dict]:
    """Run the full content generation pipeline.

    Args:
        topics: List of topic configs. If None, uses all TOPICS.
        generate_only: If True, only generate articles and thumbnails (no Ghost publish).
        publish_only: If True, only publish existing files to Ghost (no generation).

    Returns:
        List of result dicts with slug, status, and optionally ghost_id/ghost_url.
    """
    if topics is None:
        topics = TOPICS

    api_key = GHOST_ADMIN_KEY
    if not publish_only and not generate_only and not api_key:
        print("WARNING: GHOST_ADMIN_KEY not set. Running in generate-only mode.")
        generate_only = True

    results = []

    for i, topic_config in enumerate(topics, 1):
        topic = topic_config["topic"]
        print(f"\n--- [{i}/{len(topics)}] {topic} ---")

        slug = None

        if not publish_only:
            # Stage 1: Generate article
            print("  Stage 1: Generating article...")
            article_md = generate_article(
                topic,
                topic_config["keywords"],
                topic_config["tags"],
            )
            slug = _extract_slug(article_md, topic)
            article_path = ARTICLES_DIR / f"{slug}.md"
            article_path.write_text(article_md, encoding="utf-8")
            print(f"  Article saved: {article_path}")

            # Stage 2: Generate thumbnail
            print("  Stage 2: Generating thumbnail...")
            thumb_path = THUMBNAILS_DIR / f"{slug}.png"
            generate_thumbnail(
                title=topic,
                tag=topic_config["tags"][0],
                output_path=str(thumb_path),
            )
            print(f"  Thumbnail saved: {thumb_path}")
        else:
            # Find existing article file for this topic
            from slugify import slugify

            slug = slugify(topic)
            article_path = ARTICLES_DIR / f"{slug}.md"
            thumb_path = THUMBNAILS_DIR / f"{slug}.png"

            if not article_path.exists():
                print(f"  SKIP: Article not found at {article_path}")
                results.append({"slug": slug, "status": "skipped", "reason": "article not found"})
                continue

        result_entry = {"slug": slug, "status": "generated"}

        if not generate_only:
            # Stage 3: Publish to Ghost
            print("  Stage 3: Publishing to Ghost as draft...")
            try:
                article_path = ARTICLES_DIR / f"{slug}.md"
                thumb_path = THUMBNAILS_DIR / f"{slug}.png"
                ghost_post = publish_article(
                    str(article_path),
                    str(thumb_path),
                    api_key,
                )
                result_entry.update(
                    {
                        "status": "draft",
                        "ghost_id": ghost_post.get("id"),
                        "ghost_url": ghost_post.get("url"),
                    }
                )
                print(f"  Published as draft: {ghost_post.get('url', 'unknown')}")
            except Exception as e:
                result_entry.update({"status": "error", "error": str(e)})
                print(f"  ERROR publishing: {e}")

        results.append(result_entry)

    # Save results metadata
    OUTPUT_DIR.mkdir(exist_ok=True)
    output_file = OUTPUT_DIR / "published.json"
    output_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nPipeline complete. {len(results)} articles processed.")
    print(f"Results saved to: {output_file}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TendHunt content pipeline")
    parser.add_argument(
        "--generate-only",
        action="store_true",
        help="Only generate articles and thumbnails (no Ghost publish)",
    )
    parser.add_argument(
        "--publish-only",
        action="store_true",
        help="Only publish existing files to Ghost (no generation)",
    )
    args = parser.parse_args()

    if args.generate_only and args.publish_only:
        print("ERROR: Cannot use both --generate-only and --publish-only")
        sys.exit(1)

    run_pipeline(
        generate_only=args.generate_only,
        publish_only=args.publish_only,
    )
