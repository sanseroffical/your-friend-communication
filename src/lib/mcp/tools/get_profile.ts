import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Fetch the signed-in FriendChat user's profile (display name, clipID, bio, level, XP).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, clip_id, display_name, bio, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      return { content: [{ type: "text", text: profileError.message }], isError: true };
    }

    const { data: level } = await supabase
      .from("user_levels")
      .select("level, xp")
      .eq("user_id", userId)
      .maybeSingle();

    const result = { profile, level: level ?? { level: 1, xp: 0 } };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
