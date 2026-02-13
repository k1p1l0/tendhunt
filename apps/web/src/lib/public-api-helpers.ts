import { authenticateApiKey } from "@/lib/api-key-auth";

import type { ApiKeyAuth } from "@/lib/api-key-auth";

// WARNING: In-memory rate limiter — works for single-instance only.
// For multi-instance production (Cloudflare Pages, Vercel), replace with Redis or Cloudflare KV.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100;

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((val, key) => {
    if (val.resetAt < now) rateLimitMap.delete(key);
  });
}, 60_000);

export function publicApiResponse(data: unknown, status = 200) {
  return Response.json({ ok: true, data }, { status });
}

export function publicApiError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export function checkRateLimit(keyHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyHash);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(keyHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export async function authenticatePublicApi(
  request: Request
): Promise<{ auth: ApiKeyAuth | null; errorResponse: Response | null }> {
  const auth = await authenticateApiKey(request);

  if (!auth) {
    return {
      auth: null,
      errorResponse: publicApiError("Invalid or missing API key", 401),
    };
  }

  if (!checkRateLimit(auth.keyHash)) {
    return {
      auth: null,
      errorResponse: publicApiError("Rate limit exceeded (100 req/min)", 429),
    };
  }

  return { auth, errorResponse: null };
}
