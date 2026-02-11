"""Post-processing: add internal links between articles and publish.

Reads generated articles, adds related-article links, a TendHunt CTA,
contextual inline links, updates Ghost posts, and optionally publishes all.

Usage:
    python add_internal_links.py              # Add links only (update drafts)
    python add_internal_links.py --publish    # Add links AND publish all drafts
"""

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

import frontmatter
import requests

from config import ARTICLES_DIR, GHOST_ADMIN_KEY, GHOST_URL, OUTPUT_DIR
from publish_to_ghost import ghost_headers, markdown_to_ghost_html


def _load_published() -> list[dict]:
    """Load published.json metadata."""
    path = OUTPUT_DIR / "published.json"
    if not path.exists():
        print("ERROR: output/published.json not found. Run pipeline.py first.")
        sys.exit(1)
    return json.load(open(path))


def _load_article(slug: str) -> tuple[dict, str]:
    """Load article frontmatter and body.

    Returns:
        Tuple of (metadata dict, body string).
    """
    path = ARTICLES_DIR / f"{slug}.md"
    if not path.exists():
        return {}, ""
    post = frontmatter.load(str(path))
    return dict(post.metadata), post.content


def _find_related_articles(
    current_slug: str,
    current_tags: list[str],
    all_articles: list[dict],
    max_related: int = 3,
) -> list[dict]:
    """Find related articles by tag overlap.

    Args:
        current_slug: Slug of the current article.
        current_tags: Tags of the current article.
        all_articles: List of all article metadata dicts.
        max_related: Maximum number of related articles to return.

    Returns:
        List of related article dicts sorted by relevance.
    """
    current_tag_set = set(t.lower() for t in current_tags)
    scored = []

    for article in all_articles:
        if article["slug"] == current_slug:
            continue
        article_tags = set(t.lower() for t in article.get("tags", []))
        overlap = len(current_tag_set & article_tags)
        if overlap > 0:
            scored.append((overlap, article))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored[:max_related]]


def _add_inline_link(body: str, target_title: str, target_slug: str) -> str:
    """Add a contextual inline link for a keyword in the article body.

    Finds the first mention of a significant keyword from the target title
    and wraps it in a markdown link. Only adds one inline link per target.

    Args:
        body: Article markdown body.
        target_title: Title of the target article.
        target_slug: Slug of the target article.

    Returns:
        Updated body with inline link added (or unchanged if no match).
    """
    # Extract significant keywords from title (3+ chars, not common words)
    stop_words = {
        "the", "and", "for", "how", "what", "why", "when", "are", "can",
        "you", "your", "with", "from", "that", "this", "will", "have",
        "every", "must", "into", "also", "been", "more", "than", "most",
        "all", "its", "they", "their", "about", "each", "has", "our",
        "new", "one", "two", "was", "not", "but",
    }
    keywords = [
        w for w in target_title.split()
        if len(w) >= 3 and w.lower().strip(",:;.!?") not in stop_words
    ]

    # Try multi-word phrases first (2-3 word combinations)
    for length in [3, 2]:
        for i in range(len(keywords) - length + 1):
            phrase = " ".join(keywords[i : i + length])
            # Case-insensitive search, only match if not already in a link
            pattern = re.compile(
                r"(?<!\[)(" + re.escape(phrase) + r")(?!\]|\()(?![^[]*\])",
                re.IGNORECASE,
            )
            match = pattern.search(body)
            if match:
                linked = f"[{match.group(1)}](/blog/{target_slug}/)"
                return body[: match.start()] + linked + body[match.end() :]

    # Fall back to single significant keywords
    for kw in keywords:
        kw_clean = kw.strip(",:;.!?")
        if len(kw_clean) < 4:
            continue
        pattern = re.compile(
            r"(?<!\[)\b(" + re.escape(kw_clean) + r")\b(?!\]|\()(?![^[]*\])",
            re.IGNORECASE,
        )
        match = pattern.search(body)
        if match:
            linked = f"[{match.group(1)}](/blog/{target_slug}/)"
            return body[: match.start()] + linked + body[match.end() :]

    return body


CTA_PARAGRAPH = (
    "\n\n---\n\n"
    "*Discover how TendHunt helps suppliers find and win UK government contracts. "
    "Our platform aggregates tenders from all major portals, provides buyer intelligence, "
    "and sends you alerts for relevant opportunities. "
    "[Join the waitlist](/) to get early access.*"
)

RELATED_HEADER = "\n\n## Related Articles\n\n"


def add_internal_links() -> list[dict]:
    """Add internal links between all generated articles.

    For each article:
    1. Find 2-3 related articles by tag overlap
    2. Add 1-2 contextual inline links in the body
    3. Add a Related Articles section at the bottom
    4. Add a TendHunt CTA paragraph
    5. Save updated markdown
    6. Update Ghost post with new HTML

    Returns:
        List of update results.
    """
    published = _load_published()
    api_key = GHOST_ADMIN_KEY

    if not api_key:
        print("ERROR: GHOST_ADMIN_KEY not set.")
        sys.exit(1)

    # Load all article metadata for cross-referencing
    all_articles = []
    for entry in published:
        metadata, _ = _load_article(entry["slug"])
        all_articles.append(
            {
                "slug": entry["slug"],
                "ghost_id": entry["ghost_id"],
                "title": metadata.get("title", entry["slug"]),
                "tags": metadata.get("tags", []),
            }
        )

    results = []

    for i, article in enumerate(all_articles):
        slug = article["slug"]
        ghost_id = article["ghost_id"]
        print(f"\n[{i + 1}/{len(all_articles)}] Processing: {slug}")

        metadata, body = _load_article(slug)
        if not body:
            print(f"  SKIP: Article file not found")
            results.append({"slug": slug, "status": "skipped"})
            continue

        # Remove existing Related Articles section and CTA if re-running
        body = re.sub(
            r"\n+---\n+\*Discover how TendHunt.*?\*",
            "",
            body,
            flags=re.DOTALL,
        )
        body = re.sub(
            r"\n+## Related Articles\n.*",
            "",
            body,
            flags=re.DOTALL,
        )

        # 1. Find related articles
        related = _find_related_articles(
            slug, article["tags"], all_articles, max_related=3
        )
        print(f"  Found {len(related)} related articles")

        # 2. Add inline links (max 2)
        inline_count = 0
        for rel in related[:2]:
            new_body = _add_inline_link(body, rel["title"], rel["slug"])
            if new_body != body:
                body = new_body
                inline_count += 1
        print(f"  Added {inline_count} inline links")

        # 3. Add Related Articles section
        if related:
            body += RELATED_HEADER
            for rel in related:
                body += f"- [{rel['title']}](/blog/{rel['slug']}/)\n"

        # 4. Add CTA
        body += CTA_PARAGRAPH

        # 5. Save updated markdown
        post = frontmatter.Post(body, **metadata)
        article_path = ARTICLES_DIR / f"{slug}.md"
        with open(article_path, "w", encoding="utf-8") as f:
            f.write(frontmatter.dumps(post))
        print(f"  Saved updated markdown")

        # 6. Update Ghost post
        try:
            # Get current post to obtain updated_at for collision detection
            headers = ghost_headers(api_key)
            resp = requests.get(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/",
                headers=headers,
            )
            resp.raise_for_status()
            current_post = resp.json()["posts"][0]
            updated_at = current_post["updated_at"]

            # Convert to HTML and update
            html_content = markdown_to_ghost_html(body)
            update_body = {
                "posts": [
                    {
                        "html": html_content,
                        "updated_at": updated_at,
                    }
                ]
            }
            resp = requests.put(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/?source=html",
                headers=ghost_headers(api_key),
                json=update_body,
            )
            resp.raise_for_status()
            print(f"  Ghost post updated")
            results.append({"slug": slug, "status": "updated"})
        except Exception as e:
            print(f"  ERROR updating Ghost: {e}")
            results.append({"slug": slug, "status": "error", "error": str(e)})

        # Small delay to avoid rate limiting
        time.sleep(0.5)

    return results


def publish_all_drafts() -> list[dict]:
    """Publish all draft posts in Ghost.

    Returns:
        List of publish results.
    """
    published = _load_published()
    api_key = GHOST_ADMIN_KEY

    if not api_key:
        print("ERROR: GHOST_ADMIN_KEY not set.")
        sys.exit(1)

    results = []

    for entry in published:
        slug = entry["slug"]
        ghost_id = entry["ghost_id"]
        print(f"Publishing: {slug}")

        try:
            # Get current post state
            headers = ghost_headers(api_key)
            resp = requests.get(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/",
                headers=headers,
            )
            resp.raise_for_status()
            current_post = resp.json()["posts"][0]

            if current_post["status"] == "published":
                print(f"  Already published, skipping")
                results.append({"slug": slug, "status": "already_published"})
                continue

            # Publish the post
            update_body = {
                "posts": [
                    {
                        "status": "published",
                        "updated_at": current_post["updated_at"],
                    }
                ]
            }
            resp = requests.put(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/",
                headers=ghost_headers(api_key),
                json=update_body,
            )
            resp.raise_for_status()
            result_post = resp.json()["posts"][0]
            print(f"  Published: {result_post.get('url', 'unknown')}")
            results.append({
                "slug": slug,
                "status": "published",
                "url": result_post.get("url", ""),
            })
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"slug": slug, "status": "error", "error": str(e)})

        time.sleep(0.3)

    # Update published.json
    updated_published = _load_published()
    status_map = {r["slug"]: r.get("status") for r in results}
    url_map = {r["slug"]: r.get("url", "") for r in results}
    for entry in updated_published:
        if entry["slug"] in status_map:
            new_status = status_map[entry["slug"]]
            if new_status in ("published", "already_published"):
                entry["status"] = "published"
            if url_map.get(entry["slug"]):
                entry["ghost_url"] = url_map[entry["slug"]]

    with open(OUTPUT_DIR / "published.json", "w") as f:
        json.dump(updated_published, f, indent=2)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Add internal links between articles and optionally publish"
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Also publish all drafts after adding links",
    )
    args = parser.parse_args()

    print("=== Adding Internal Links ===")
    link_results = add_internal_links()

    success = sum(1 for r in link_results if r["status"] == "updated")
    errors = sum(1 for r in link_results if r["status"] == "error")
    print(f"\nLink results: {success} updated, {errors} errors")

    if args.publish:
        print("\n=== Publishing All Drafts ===")
        pub_results = publish_all_drafts()
        published = sum(
            1 for r in pub_results
            if r["status"] in ("published", "already_published")
        )
        pub_errors = sum(1 for r in pub_results if r["status"] == "error")
        print(f"\nPublish results: {published} published, {pub_errors} errors")
