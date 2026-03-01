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
        // Fetch user activity
        const { data: activities } = await supabase
          .from("user_activity")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Fetch user level
        const { data: level } = await supabase
          .from("user_levels")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const activitySummary = summarizeActivity(activities || []);

        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are a smart assistant for a social chat app. Based on the user's activity data, suggest 3-5 personalized features or actions they should try. The app has: chat rooms, DMs, social feed, stories, games (snake, tetris, memory, trivia, etc.), quests, friends, profile customization (themes, banners, music, GIF avatars), leaderboards, and more.

Return a JSON array of suggestions, each with:
- "title": Short action title
- "description": Why they should try it (personalized)
- "type": "feature_discovery", "engagement", "social", "achievement", or "customization"
- "action_path": Which part of the app (e.g., "games", "social", "profile", "quests", "friends")
- "priority": "high", "medium", "low"`,
          },
          {
            role: "user",
            content: `User profile: ${JSON.stringify(profile || {})}
User level: ${JSON.stringify(level || {})}
Recent activity summary: ${activitySummary}
Features they've used: ${(activities || []).map(a => a.activity_type).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "none tracked yet"}`,
          },
        ]);
        result = { suggestions: aiResponse };
        break;
      }

      case "onboarding_guide": {
        const { current_step, user_interests } = params;

        const { data: activities } = await supabase
          .from("user_activity")
          .select("activity_type")
          .eq("user_id", user.id);

        const usedFeatures = [...new Set((activities || []).map(a => a.activity_type))];

        const aiResponse = await callAI(LOVABLE_API_KEY, [
          {
            role: "system",
            content: `You are an onboarding guide for a social chat app. Based on the user's interests and what they've already tried, create a personalized onboarding step. The app features: chat rooms, DMs, social feed with posts/stories, 20+ mini-games, quests & achievements, friend system, profile customization (themes, banners, GIF avatars, music), leaderboards, emojis & stickers, and Clippy AI assistant.

Return JSON:
- "welcome_message": A friendly personalized message
- "recommended_steps": Array of 3-5 next steps, each with "title", "description", "feature_area"
- "fun_tip": A fun fact or tip about the app
- "estimated_time": How long the onboarding steps would take`,
          },
          {
            role: "user",
            content: `Current step: ${current_step || "start"}
User interests: ${user_interests || "not specified"}
Features already used: ${usedFeatures.join(", ") || "none yet"}`,
          },
        ]);
        result = { guide: aiResponse };
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
    const status = message === "Unauthorized" ? 401 : 500;
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

  // Try to parse JSON from the response
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
