// Handles the Discord OAuth code-exchange for account linking.
// Requires: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET (set via add_secret).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body { code: string; redirect_uri: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const clientId = Deno.env.get("DISCORD_CLIENT_ID");
    const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return json({ error: "Discord not configured. Ask an admin to set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET." }, 503);
    }

    const body: Body = await req.json();
    if (!body?.code || !body?.redirect_uri) return json({ error: "Missing code/redirect_uri" }, 400);

    const tokRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: body.code,
        redirect_uri: body.redirect_uri,
      }),
    });
    if (!tokRes.ok) return json({ error: `Discord token error: ${tokRes.status}` }, 400);
    const tok = await tokRes.json();

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (!meRes.ok) return json({ error: "Failed to fetch Discord profile" }, 400);
    const me = await meRes.json();

    // Use service role via a second client for the profile update (needs admin RLS bypass? No — user updates their own profile.)
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        discord_id: String(me.id),
        discord_username: me.username,
        discord_avatar: me.avatar,
      })
      .eq("id", userId);
    if (upErr) return json({ error: upErr.message }, 400);

    return json({ ok: true, discord: { id: me.id, username: me.username, avatar: me.avatar } });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
