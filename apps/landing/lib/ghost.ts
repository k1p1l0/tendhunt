const GHOST_URL = process.env.GHOST_URL!;
const GHOST_ADMIN_KEY = process.env.GHOST_ADMIN_KEY!;

// --- Types ---

export interface GhostAuthor {
  id: string;
  name: string;
  slug: string;
  profile_image: string | null;
}

export interface GhostTag {
  id: string;
  name: string;
  slug: string;
}

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  html: string;
  excerpt: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  published_at: string;
  updated_at: string;
  reading_time: number;
  authors: GhostAuthor[];
  tags: GhostTag[];
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
}

// --- JWT generation (HS256 via Web Crypto) ---

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64url(data: string | Uint8Array): string {
  const str =
    typeof data === "string"
      ? btoa(data)
      : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateGhostJWT(): Promise<string> {
  const [id, secret] = GHOST_ADMIN_KEY.split(":");

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));

  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iat: now,
      exp: now + 5 * 60,
      aud: "/admin/",
    }),
  );

  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    hexToUint8Array(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput)),
  );

  return `${signingInput}.${base64url(signature)}`;
}

// --- API helpers ---

async function ghostFetch<T>(endpoint: string): Promise<T> {
  const token = await generateGhostJWT();
  const url = `${GHOST_URL}/ghost/api/admin${endpoint}`;

  const res = await fetch(url, {
    headers: { Authorization: `Ghost ${token}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Ghost API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// --- HTML rewriting ---

function rewriteGhostLinks(html: string): string {
  if (!html) return html;
  const ghostOrigin = GHOST_URL.replace(/\/$/, "");
  // Rewrite Ghost blog links: https://ghost-admin.tendhunt.com/blog/slug/ → /blog/slug
  // Rewrite Ghost root links: https://ghost-admin.tendhunt.com/ → /blog
  // Don't rewrite Ghost content/image URLs
  return html.replace(
    new RegExp(`href="${ghostOrigin}(/blog/[^"]*?)/?"`, "g"),
    'href="$1"',
  ).replace(
    new RegExp(`href="${ghostOrigin}/?"`, "g"),
    'href="/blog"',
  );
}

// --- Public API ---

export async function getGhostPosts(): Promise<GhostPost[]> {
  const data = await ghostFetch<{ posts: GhostPost[] }>(
    "/posts/?include=tags,authors&formats=html&filter=status:published&order=published_at%20desc&limit=all",
  );
  return data.posts.map((post) => ({
    ...post,
    html: rewriteGhostLinks(post.html),
  }));
}

export async function getGhostPostBySlug(
  slug: string,
): Promise<GhostPost | null> {
  try {
    const data = await ghostFetch<{ posts: GhostPost[] }>(
      `/posts/slug/${slug}/?include=tags,authors&formats=html`,
    );
    const post = data.posts[0] ?? null;
    if (post) {
      post.html = rewriteGhostLinks(post.html);
    }
    return post;
  } catch {
    return null;
  }
}
