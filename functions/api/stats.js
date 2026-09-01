// Cloudflare Pages Function: proxies YouTube Data API v3
// The API key is stored server-side as env variable YT_API_KEY (Pages → Settings → Environment variables)

const CHANNEL_ID = 'UCHsV70H6L1F6dsONYVjH6Tg'; // @klarundsimple

export async function onRequestGet({ env }) {
  const key = env.YT_API_KEY;
  if (!key) {
    return json({ error: 'YT_API_KEY not configured' }, 500);
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${key}`;

  try {
    const res = await fetch(url, {
      cf: { cacheTtl: 900, cacheEverything: true }, // 15 min edge cache
    });
    const data = await res.json();
    const s = data?.items?.[0]?.statistics;
    if (!s) return json({ error: 'no stats' }, 502);

    return json({
      subs:   parseInt(s.subscriberCount, 10),
      videos: parseInt(s.videoCount, 10),
      views:  parseInt(s.viewCount, 10),
    });
  } catch (err) {
    return json({ error: 'fetch failed', detail: String(err) }, 502);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=900, s-maxage=900',
    },
  });
}
