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
  name: "send_chat_message",
  title: "Send chat message",
  description: "Post a message to a FriendChat room as the signed-in user. Room codes are alphanumeric (e.g. 'C6ZC9N').",
  inputSchema: {
    room_code: z.string().regex(/^[A-Za-z0-9]{1,20}$/).describe("Alphanumeric room code."),
    content: z.string().min(1).max(10000).describe("Message text (1-10000 chars)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ room_code, content }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_code,
        content,
        sender_id: userId,
        sender_name: profile?.display_name || "User",
      } as any)
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Sent to ${room_code}: ${content}` }],
      structuredContent: { message: data },
    };
  },
});
