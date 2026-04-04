import { corsHeaders } from '@supabase/supabase-js/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twitch';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const TWITCH_API_KEY = Deno.env.get('TWITCH_API_KEY');
  if (!TWITCH_API_KEY) {
    return new Response(JSON.stringify({ error: 'TWITCH_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { usernames } = await req.json();

    if (!Array.isArray(usernames) || usernames.length === 0 || usernames.length > 100) {
      return new Response(JSON.stringify({ error: 'Provide 1-100 usernames' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate usernames
    for (const u of usernames) {
      if (typeof u !== 'string' || !/^[a-zA-Z0-9_]{1,25}$/.test(u)) {
        return new Response(JSON.stringify({ error: `Invalid username: ${u}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const queryParams = usernames.map(u => `user_login=${encodeURIComponent(u)}`).join('&');

    const streamsRes = await fetch(`${GATEWAY_URL}/streams?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWITCH_API_KEY,
      },
    });

    if (!streamsRes.ok) {
      const body = await streamsRes.text();
      throw new Error(`Twitch API error [${streamsRes.status}]: ${body}`);
    }

    const streamsData = await streamsRes.json();

    // Build a map of live usernames
    const liveMap: Record<string, { game_name: string; title: string; viewer_count: number }> = {};
    for (const stream of (streamsData.data || [])) {
      liveMap[stream.user_login.toLowerCase()] = {
        game_name: stream.game_name || '',
        title: stream.title || '',
        viewer_count: stream.viewer_count || 0,
      };
    }

    return new Response(JSON.stringify({ live: liveMap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Twitch status error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
