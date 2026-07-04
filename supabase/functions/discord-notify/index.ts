// Admin-only relay to a Discord webhook.
// Requires: DISCORD_WEBHOOK_URL (set via add_secret).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  title: string;
  description?: string;
  color?: number;
  event?: "announcement" | "report" | "feature_request";
}

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
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (!webhook) return json({ error: "Webhook not configured" }, 503);

    const body: Body = await req.json();
    if (!body?.title) return json({ error: "Missing title" }, 400);

    // Respect per-event toggle
    if (body.event) {
      const { data: settings } = await supabase.from("app_settings")
        .select("discord_notify_reports, discord_notify_feature_requests, discord_notify_announcements")
        .maybeSingle();
      const map: Record<string, boolean> = {
        report: !!settings?.discord_notify_reports,
        feature_request: !!settings?.discord_notify_feature_requests,
        announcement: !!settings?.discord_notify_announcements,
      };
      if (!map[body.event]) return json({ ok: true, skipped: true });
    }

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: body.title.slice(0, 256),
          description: (body.description ?? "").slice(0, 4000),
          color: body.color ?? 0x8b5cf6,
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    if (!res.ok) return json({ error: `Discord webhook ${res.status}` }, 502);
    return json({ ok: true });
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
