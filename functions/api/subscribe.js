// Cloudflare Pages Function: subscribes an email to the Beehiiv newsletter.
// API key is stored server-side as env var BEEHIIV_API_KEY.

const PUBLICATION_ID = 'pub_15f67e35-9637-4b95-b2f3-63333feeec1d';

export async function onRequestPost({ request, env }) {
  const key = env.BEEHIIV_API_KEY;
  if (!key) return json({ error: 'newsletter not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const email = (body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid email' }, 400);
  }
  // Honeypot: silently succeed for bots
  if (body.honeypot) return json({ status: 'ok' });

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'klarundsimple.com',
          utm_medium: 'organic',
          utm_campaign: 'website-form',
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: 'signup failed', detail: errText }, 502);
    }

    return json({ status: 'ok' });
  } catch (err) {
    return json({ error: 'network error', detail: String(err) }, 502);
  }
}

// Allow only POST from same origin
export async function onRequest({ request }) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
