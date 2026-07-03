import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase();
  return (
    h === 'localhost' ||
    h === '::1' ||
    h.endsWith('.local') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^0\./.test(h) ||
    h.startsWith('fc') ||
    h.startsWith('fd')
  );
};

const validateUrl = (raw: string): { ok: true; url: URL } | { ok: false; error: string; status: number } => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'Invalid URL', status: 400 };
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return { ok: false, error: 'Unsupported protocol', status: 400 };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'Forbidden host', status: 403 };
  }
  return { ok: true, url: parsed };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // JWT validation — reject forged/anonymous tokens
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return jsonResponse({ error: 'URL required' }, 400);
    }

    const v = validateUrl(url);
    if (!v.ok) return jsonResponse({ error: v.error }, v.status);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // SSRF hardening: don't auto-follow redirects (an open-redirect on an
    // allowed host could otherwise land us on 169.254.169.254 or an internal
    // IP). Follow up to 3 hops manually, re-validating each destination.
    let currentUrl = url;
    let response: Response | null = null;
    try {
      for (let hop = 0; hop < 4; hop++) {
        const check = validateUrl(currentUrl);
        if (!check.ok) return jsonResponse({ error: check.error }, check.status);

        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
            Accept: 'text/html',
          },
          signal: controller.signal,
          redirect: 'manual',
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) break;
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
        break;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!response) return jsonResponse({ error: 'Failed to fetch preview' }, 502);
    if (response.status >= 300 && response.status < 400) {
      return jsonResponse({ error: 'Too many redirects' }, 400);
    }

    const html = await response.text();

    const getMetaContent = (property: string): string | null => {
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'));
      if (ogMatch) return ogMatch[1];

      const twMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, 'i'));
      if (twMatch) return twMatch[1];

      const metaMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
      if (metaMatch) return metaMatch[1];

      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    const preview = {
      title: getMetaContent('title') || (titleMatch ? titleMatch[1].trim() : null),
      description: getMetaContent('description'),
      image: getMetaContent('image'),
      site_name: getMetaContent('site_name'),
      url: currentUrl,
    };

    if (preview.image && !preview.image.startsWith('http')) {
      const urlObj = new URL(currentUrl);
      preview.image = preview.image.startsWith('/')
        ? `${urlObj.origin}${preview.image}`
        : `${urlObj.origin}/${preview.image}`;
    }

    return jsonResponse(preview);
  } catch (_error) {
    return jsonResponse({ error: 'Failed to fetch preview' }, 500);
  }
});
