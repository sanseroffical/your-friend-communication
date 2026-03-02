import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { action, ...params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let result;

    switch (action) {
      case "analyze_feedback": {
        const { content, feedback_type } = params;
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are a product feedback analyzer for a social chat application. Analyze user feedback and return a JSON object with:
- "summary": A brief 1-2 sentence summary
- "sentiment": One of "positive", "negative", "neutral", "mixed"
- "category": One of "ui", "performance", "feature", "bug", "social", "games", "chat", "other"
- "actionable_suggestions": Array of 1-3 concrete feature ideas based on the feedback`,
          },
          { role: "user", content: `Feedback type: ${feedback_type}\n\nFeedback: ${content}` },
        ]);
        result = { analysis: aiResponse };
        break;
      }

      case "analyze_feature_request": {
        const { title, description } = params;
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are a feature request analyzer for a social chat app with games, quests, social feed, stories, DMs, and more. Analyze the feature request and return JSON:
- "category": Best fit from "chat", "social", "games", "ui", "accessibility", "moderation", "profile", "notifications", "other"
- "priority": "low", "medium", "high", or "critical"
- "feasibility": "easy", "medium", "hard"
- "impact": Brief description of user impact
- "similar_features": Array of existing features this relates to
- "implementation_idea": A brief description of how this could work`,
          },
          { role: "user", content: `Title: ${title}\nDescription: ${description}` },
        ]);
        result = { analysis: aiResponse };
        break;
      }

      case "get_smart_suggestions": {
        const { data: activities } = await supabase
          .from("user_activity")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        const { data: level } = await supabase.from("user_levels").select("*").eq("user_id", user.id).single();
        const activitySummary = summarizeActivity(activities || []);

        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are a smart assistant for a social chat app. Based on the user's activity data, suggest 3-5 personalized features or actions they should try. The app has: chat rooms, DMs, social feed, stories, games (25+), quests, friends, profile customization, leaderboards, music player, AI image generator, and more.
Return a JSON array of suggestions, each with:
- "title": Short action title
- "description": Why they should try it
- "type": "feature_discovery", "engagement", "social", "achievement", or "customization"
- "action_path": Which part of the app
- "priority": "high", "medium", "low"`,
          },
          {
            role: "user",
            content: `User profile: ${JSON.stringify(profile || {})}
User level: ${JSON.stringify(level || {})}
Recent activity: ${activitySummary}
Features used: ${(activities || []).map(a => a.activity_type).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "none yet"}`,
          },
        ]);
        result = { suggestions: aiResponse };
        break;
      }

      case "onboarding_guide": {
        const { current_step, user_interests } = params;
        const { data: activities } = await supabase.from("user_activity").select("activity_type").eq("user_id", user.id);
        const usedFeatures = [...new Set((activities || []).map(a => a.activity_type))];

        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are an onboarding guide for a social chat app. Create a personalized onboarding step. Features include: chat rooms, DMs, 25+ games, quests, social feed, stories, friends, profiles, music player, AI image generation, and Clippy AI assistant.
Return JSON:
- "welcome_message": A friendly personalized message
- "recommended_steps": Array of 3-5 next steps with "title", "description", "feature_area"
- "fun_tip": A fun fact or tip
- "estimated_time": How long steps would take`,
          },
          {
            role: "user",
            content: `Step: ${current_step || "start"}\nInterests: ${user_interests || "not specified"}\nUsed features: ${usedFeatures.join(", ") || "none yet"}`,
          },
        ]);
        result = { guide: aiResponse };
        break;
      }

      case "smart_replies": {
        const { recent_messages } = params;
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `Generate 3 short, natural smart reply suggestions for a chat message. Each reply should be 2-8 words. Return a JSON array of 3 strings. Be casual, friendly, and varied - one agreeing, one asking more, one playful.`,
          },
          {
            role: "user",
            content: `Recent messages:\n${(recent_messages || []).map((m: any) => `${m.senderName || m.role}: ${m.content || m.text}`).join("\n")}`,
          },
        ]);
        result = { replies: Array.isArray(aiResponse) ? aiResponse : [] };
        break;
      }

      case "moderate_message": {
        const { message_content, sender_name } = params;
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are a chat moderation AI. Analyze the message for: toxicity, spam, harassment, hate speech, inappropriate content.
Return JSON:
- "is_flagged": boolean
- "reason": string or null (brief reason if flagged)
- "severity": "low", "medium", "high" (only if flagged)
- "suggestion": string (suggested action: "allow", "warn", "filter", "block")`,
          },
          { role: "user", content: `Sender: ${sender_name}\nMessage: ${message_content}` },
        ]);
        result = { moderation: aiResponse };
        break;
      }

      case "summarize_thread": {
        const { messages: threadMessages } = params;
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `Summarize this chat thread in 2-3 sentences. Highlight key topics, decisions, and who said what. Be concise.`,
          },
          {
            role: "user",
            content: (threadMessages || []).map((m: any) => `${m.senderName}: ${m.content}`).join("\n"),
          },
        ]);
        result = { summary: typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse) };
        break;
      }

      case "generate_image": {
        const { prompt } = params;
        const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: `Generate: ${prompt}` }],
            modalities: ["image", "text"],
          }),
        });

        if (!imgResponse.ok) {
          if (imgResponse.status === 429) throw new Error("Rate limited, please try again later");
          if (imgResponse.status === 402) throw new Error("AI usage limit reached");
          throw new Error("Image generation failed");
        }

        const imgData = await imgResponse.json();
        const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageUrl) throw new Error("No image generated");
        result = { imageUrl };
        break;
      }

      case "clippy_with_image": {
        const { messages: chatMessages, image_url } = params;
        const aiMessages = [
          {
            role: "system",
            content: `You are Clippy, a helpful AI assistant in FriendChat. You can analyze images users share. Be helpful, witty, and use emojis. Keep responses concise.`,
          },
          ...chatMessages,
        ];
        
        // If there's an image, add it to the last user message
        if (image_url) {
          const lastUserIdx = aiMessages.length - 1;
          aiMessages[lastUserIdx] = {
            role: "user",
            content: [
              { type: "text", text: aiMessages[lastUserIdx].content || "What do you see in this image?" },
              { type: "image_url", image_url: { url: image_url } },
            ] as any,
          };
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: aiMessages,
          }),
        });

        if (response.status === 429) throw new Error("Rate limited, please try again later");
        if (response.status === 402) throw new Error("AI usage limit reached");
        if (!response.ok) throw new Error("AI service unavailable");

        const data = await response.json();
        result = { message: data.choices?.[0]?.message?.content || "I couldn't analyze that! 📎" };
        break;
      }

      case "clippy_room_message": {
        const { room_messages, user_question } = params;
        const context = (room_messages || []).slice(-20).map((m: any) => `${m.senderName}: ${m.content}`).join("\n");
        
        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are Clippy, an AI assistant observing a chat room. You can see recent messages and answer questions about the conversation. Be helpful, witty, concise. Use emojis. If asked about the chat, summarize or provide insights. You have a rivalry with Bonzi Buddy.`,
          },
          {
            role: "user",
            content: `Recent chat messages:\n${context}\n\nUser question: ${user_question}`,
          },
        ]);
        result = { message: typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse) };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-features error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message.includes("Rate limited") ? 429 : message.includes("usage limit") ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
    }),
  });

  if (response.status === 429) throw new Error("Rate limited, please try again later");
  if (response.status === 402) throw new Error("AI usage limit reached");
  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error("AI service unavailable");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/) || content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function summarizeActivity(activities: Array<{ activity_type: string; metadata: Record<string, unknown>; created_at: string }>) {
  const counts: Record<string, number> = {};
  for (const a of activities) {
    counts[a.activity_type] = (counts[a.activity_type] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.map(([type, count]) => `${type}: ${count} times`).join(", ") || "No activity recorded yet";
}
