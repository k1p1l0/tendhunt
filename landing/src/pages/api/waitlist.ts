export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { email, company, role, 'cf-turnstile-response': turnstileToken } = data;

    if (!email || !company || !role || !turnstileToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { env } = (locals as any).runtime;

    // Verify Turnstile token
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      }
    );

    const outcome: any = await verifyResponse.json();
    if (!outcome.success) {
      return new Response(
        JSON.stringify({ error: 'Bot verification failed' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = env.DB;
    await db
      .prepare('INSERT INTO waitlist (email, company, role, created_at) VALUES (?, ?, ?, ?)')
      .bind(email, company, role, new Date().toISOString())
      .run();

    return new Response(
      JSON.stringify({ success: true, message: "You're on the list! We'll email you when TendHunt launches." }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return new Response(
        JSON.stringify({ error: 'This email is already on the waitlist' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.error('Waitlist API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
