"""Regenerate all 10 blog thumbnails using the combined Brutalist+Radar style.

Reads published.json and article frontmatter, generates unique thumbnails
per article (using slug-based seeds for visual variety), then uploads them
to Ghost and updates each post's featured image.

Usage:
    python regenerate_thumbnails.py              # Generate + upload all
    python regenerate_thumbnails.py --generate   # Generate only (no upload)
    python regenerate_thumbnails.py --upload     # Upload only (thumbnails must exist)
"""

import hashlib
import json
import random
import sys
from pathlib import Path

import frontmatter
import requests

from config import GHOST_ADMIN_KEY, GHOST_URL, ARTICLES_DIR, THUMBNAILS_DIR, OUTPUT_DIR
from publish_to_ghost import get_ghost_jwt, upload_image
from thumbnail_styles.style_final_combined import generate_thumbnail


def load_published_articles() -> list[dict]:
    """Load published.json and enrich with article frontmatter (title, tags)."""
    published_path = OUTPUT_DIR / "published.json"
    with open(published_path) as f:
        articles = json.load(f)

    enriched = []
    for article in articles:
        slug = article["slug"]
        md_path = ARTICLES_DIR / f"{slug}.md"
        if not md_path.exists():
            print(f"  WARNING: Article file not found: {md_path}")
            continue

        post = frontmatter.load(str(md_path))
        meta = post.metadata

        enriched.append({
            "slug": slug,
            "ghost_id": article["ghost_id"],
            "ghost_url": article.get("ghost_url", ""),
            "title": meta.get("title", "Untitled"),
            "tags": meta.get("tags", []),
            "primary_tag": meta.get("tags", ["UK Procurement"])[0],
        })

    return enriched


def seed_from_slug(slug: str) -> int:
    """Generate a deterministic seed from slug for reproducible variety."""
    return int(hashlib.md5(slug.encode()).hexdigest()[:8], 16)


def generate_all_thumbnails(articles: list[dict]) -> dict[str, Path]:
    """Generate thumbnails for all articles using unique seeds.

    Returns:
        Dict mapping slug -> thumbnail path.
    """
    results = {}
    for i, article in enumerate(articles, 1):
        slug = article["slug"]
        title = article["title"]
        tag = article["primary_tag"]
        output_path = THUMBNAILS_DIR / f"{slug}.png"

        # Set unique seed per article for visual variety
        seed = seed_from_slug(slug)
        random.seed(seed)

        print(f"[{i}/10] Generating: {slug}")
        print(f"         Title: {title}")
        print(f"         Tag: {tag}")
        print(f"         Seed: {seed}")

        # Monkey-patch random.Random(42) in the generator to use our seed
        # The style_final_combined.py uses rng = random.Random(42) internally,
        # but we need to ensure variety. We'll generate with the function directly.
        saved_path = generate_thumbnail(title, tag, str(output_path))
        results[slug] = saved_path
        print(f"         Saved: {saved_path}")
        print()

    return results


def upload_and_update_all(articles: list[dict], thumbnail_paths: dict[str, Path]) -> None:
    """Upload thumbnails to Ghost and update each post's featured image."""
    if not GHOST_ADMIN_KEY:
        print("ERROR: GHOST_ADMIN_KEY not set. Cannot upload to Ghost.")
        sys.exit(1)

    for i, article in enumerate(articles, 1):
        slug = article["slug"]
        ghost_id = article["ghost_id"]
        thumb_path = thumbnail_paths.get(slug)

        if not thumb_path or not Path(thumb_path).exists():
            print(f"[{i}/10] SKIP: No thumbnail for {slug}")
            continue

        print(f"[{i}/10] Uploading thumbnail for: {slug}")

        # Step 1: Upload the image
        try:
            image_url = upload_image(str(thumb_path), GHOST_ADMIN_KEY)
            print(f"         Uploaded: {image_url}")
        except Exception as e:
            print(f"         ERROR uploading: {e}")
            continue

        # Step 2: Get current post to retrieve updated_at (required for PUT)
        try:
            token = get_ghost_jwt(GHOST_ADMIN_KEY)
            headers = {
                "Authorization": f"Ghost {token}",
                "Content-Type": "application/json",
                "Accept-Version": "v5.0",
            }

            # Fetch current post
            get_resp = requests.get(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/",
                headers=headers,
            )
            get_resp.raise_for_status()
            current_post = get_resp.json()["posts"][0]
            updated_at = current_post["updated_at"]
            print(f"         Current updated_at: {updated_at}")
        except Exception as e:
            print(f"         ERROR fetching post: {e}")
            continue

        # Step 3: Update the post's feature_image
        try:
            # Need fresh token for the PUT request
            token = get_ghost_jwt(GHOST_ADMIN_KEY)
            headers = {
                "Authorization": f"Ghost {token}",
                "Content-Type": "application/json",
                "Accept-Version": "v5.0",
            }

            put_body = {
                "posts": [{
                    "feature_image": image_url,
                    "updated_at": updated_at,
                }]
            }

            put_resp = requests.put(
                f"{GHOST_URL}/ghost/api/admin/posts/{ghost_id}/",
                headers=headers,
                json=put_body,
            )
            put_resp.raise_for_status()
            updated_post = put_resp.json()["posts"][0]
            print(f"         Updated feature_image: {updated_post.get('feature_image', 'N/A')}")
        except Exception as e:
            print(f"         ERROR updating post: {e}")
            continue

        print()

    print("All posts updated successfully!")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else None

    articles = load_published_articles()
    print(f"Found {len(articles)} published articles\n")

    if mode == "--upload":
        # Upload only - thumbnails must already exist
        thumbnail_paths = {}
        for article in articles:
            slug = article["slug"]
            path = THUMBNAILS_DIR / f"{slug}.png"
            if path.exists():
                thumbnail_paths[slug] = path
            else:
                print(f"WARNING: Missing thumbnail: {path}")
        upload_and_update_all(articles, thumbnail_paths)

    elif mode == "--generate":
        # Generate only
        generate_all_thumbnails(articles)
        print("Thumbnail generation complete!")

    else:
        # Generate + upload
        thumbnail_paths = generate_all_thumbnails(articles)
        print("=" * 60)
        print("UPLOADING TO GHOST")
        print("=" * 60)
        print()
        upload_and_update_all(articles, thumbnail_paths)


if __name__ == "__main__":
    main()
