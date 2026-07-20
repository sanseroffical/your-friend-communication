import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_friends",
  title: "List friends",
  description: "List the signed-in user's accepted friendships with display names and clipIDs.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data, error } = await supabase
      .from("friendships")
      .select("id, status, user_id, friend_id, created_at")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const otherIds = (data ?? []).map((r: any) => (r.user_id === userId ? r.friend_id : r.user_id));
    let profiles: any[] = [];
    if (otherIds.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, clip_id, display_name")
        .in("id", otherIds);
      profiles = p ?? [];
    }

    return {
      content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }],
      structuredContent: { friends: profiles },
    };
  },
});
