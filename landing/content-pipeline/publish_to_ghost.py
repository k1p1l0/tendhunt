"""Stage 3: Ghost Admin API publishing.

Uploads images and creates Ghost draft posts via Admin API
with ?source=html and kg-card wrapper for lossless Lexical conversion.

Usage:
    python publish_to_ghost.py articles/slug.md thumbnails/slug.png
"""

import sys
from datetime import datetime

import frontmatter
import jwt
import markdown
import requests

from config import GHOST_ADMIN_KEY, GHOST_URL


def get_ghost_jwt(admin_api_key: str) -> str:
    """Generate a Ghost Admin API JWT token from an API key.

    Args:
        admin_api_key: Ghost Admin API key in "id:secret" format.

    Returns:
        Encoded JWT token string.
    """
    key_id, secret = admin_api_key.split(":")
    iat = int(datetime.now().timestamp())
    header = {"alg": "HS256", "typ": "JWT", "kid": key_id}
    payload = {
        "iat": iat,
        "exp": iat + 5 * 60,  # 5 minute expiry
        "aud": "/admin/",
    }
    return jwt.encode(
        payload,
        bytes.fromhex(secret),
        algorithm="HS256",
        headers=header,
    )


def ghost_headers(admin_api_key: str) -> dict:
    """Return authorisation headers for Ghost Admin API.

    CRITICAL: Generates a fresh JWT per call to avoid expiry
    during batch operations.

    Args:
        admin_api_key: Ghost Admin API key in "id:secret" format.

    Returns:
        Dict with Authorization, Content-Type, and Accept-Version headers.
    """
    token = get_ghost_jwt(admin_api_key)
    return {
        "Authorization": f"Ghost {token}",
        "Content-Type": "application/json",
        "Accept-Version": "v5.0",
    }


def markdown_to_ghost_html(md_content: str) -> str:
    """Convert markdown to HTML wrapped in Ghost HTML card for lossless Lexical conversion.

    Args:
        md_content: Raw markdown string (without frontmatter).

    Returns:
        HTML string wrapped in kg-card comments.
    """
    html = markdown.markdown(
        md_content,
        extensions=["tables", "fenced_code", "codehilite", "toc", "attr_list"],
    )
    # Wrap in kg-card for lossless Lexical storage
    return f"<!--kg-card-begin: html-->\n{html}\n<!--kg-card-end: html-->"


def upload_image(filepath: str, admin_api_key: str) -> str:
    """Upload an image to Ghost and return its URL.

    Args:
        filepath: Path to the image file.
        admin_api_key: Ghost Admin API key.

    Returns:
        URL of the uploaded image on the Ghost server.
    """
    token = get_ghost_jwt(admin_api_key)
    headers = {"Authorization": f"Ghost {token}"}
    filename = filepath.split("/")[-1]
    with open(filepath, "rb") as f:
        files = {"file": (filename, f, "image/png")}
        data = {"purpose": "image", "ref": filename}
        resp = requests.post(
            f"{GHOST_URL}/ghost/api/admin/images/upload/",
            headers=headers,
            files=files,
            data=data,
        )
    resp.raise_for_status()
    return resp.json()["images"][0]["url"]


def create_post(
    title: str,
    html: str,
    feature_image_url: str,
    tags: list[str],
    meta_description: str,
    custom_excerpt: str,
    slug: str,
    admin_api_key: str,
    status: str = "draft",
) -> dict:
    """Create a Ghost post via Admin API with HTML source conversion.

    Args:
        title: Post title.
        html: HTML content (should be wrapped in kg-card).
        feature_image_url: URL of the uploaded featured image.
        tags: List of tag names.
        meta_description: SEO meta description (max 155 chars).
        custom_excerpt: Custom excerpt for cards/feeds.
        slug: URL slug for the post.
        admin_api_key: Ghost Admin API key.
        status: Post status (default: "draft").

    Returns:
        Created post dict from Ghost API response.
    """
    headers = ghost_headers(admin_api_key)
    body = {
        "posts": [
            {
                "title": title,
                "html": html,
                "status": status,
                "feature_image": feature_image_url,
                "tags": tags,
                "meta_description": meta_description,
                "custom_excerpt": custom_excerpt,
                "slug": slug,
            }
        ]
    }
    resp = requests.post(
        f"{GHOST_URL}/ghost/api/admin/posts/?source=html",
        headers=headers,
        json=body,
    )
    resp.raise_for_status()
    return resp.json()["posts"][0]


def publish_article(
    article_path: str,
    thumbnail_path: str,
    admin_api_key: str,
) -> dict:
    """Publish a markdown article with thumbnail to Ghost as a draft.

    Reads the markdown file (with frontmatter), converts to HTML,
    uploads the thumbnail, and creates the post.

    Args:
        article_path: Path to the markdown article file.
        thumbnail_path: Path to the thumbnail PNG file.
        admin_api_key: Ghost Admin API key.

    Returns:
        Created post dict from Ghost API response.
    """
    # Read article with frontmatter
    post = frontmatter.load(article_path)
    metadata = post.metadata

    # Convert markdown body to Ghost HTML
    html_content = markdown_to_ghost_html(post.content)

    # Upload thumbnail
    feature_image_url = upload_image(thumbnail_path, admin_api_key)

    # Create post as draft
    return create_post(
        title=metadata.get("title", "Untitled"),
        html=html_content,
        feature_image_url=feature_image_url,
        tags=metadata.get("tags", []),
        meta_description=metadata.get("meta_description", ""),
        custom_excerpt=metadata.get("excerpt", ""),
        slug=metadata.get("slug", "untitled"),
        admin_api_key=admin_api_key,
        status="draft",
    )


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python publish_to_ghost.py <article_path> <thumbnail_path>")
        print("  Example: python publish_to_ghost.py articles/slug.md thumbnails/slug.png")
        sys.exit(1)

    article_path = sys.argv[1]
    thumbnail_path = sys.argv[2]

    api_key = GHOST_ADMIN_KEY
    if not api_key:
        print("ERROR: GHOST_ADMIN_KEY not set. Copy .env.example to .env and fill in your key.")
        sys.exit(1)

    print(f"Publishing: {article_path}")
    result = publish_article(article_path, thumbnail_path, api_key)
    print(f"Created draft: {result.get('url', 'unknown')}")
    print(f"Ghost ID: {result.get('id', 'unknown')}")
