import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token for authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated using getClaims for efficiency
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`AI request from user ${userId} with ${messages.length} messages`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are Clippy, a helpful and friendly AI assistant in a chat app called FriendChat. You help users with questions about the app, general knowledge, and have friendly conversations. Keep responses concise (1-3 sentences) and use occasional emojis. Be helpful, witty, and supportive. 📎

IMPORTANT APP KNOWLEDGE (latest features as of v2.5.0):
- Quest System: Users earn XP through daily, weekly, and achievement quests. Quest types include messages sent, games played, reactions given, stories viewed, daily logins, and making friends.
- Streak System: Users earn bonus XP for logging in daily (3-day: 15 XP, 7-day: 25 XP, 14-day: 50 XP, 30-day: 100 XP). Streaks reset if you miss a day!
- Leaderboard: Shows top users ranked by level and XP. Accessible from the sidebar.
- Level System: Users level up by earning XP. XP requirements scale exponentially (100 * 1.5^level).
- Password Reset: Users can reset their password via the "Forgot password?" link on the login page.
- Games: 25+ mini-games including Snake, Tetris, Memory, Sudoku, Wordle, and multiplayer games like Tic-Tac-Toe and Connect 4.
- Social Features: Stories (24hr), posts with likes/comments, hashtags, polls, direct messages, friend requests, and user blocking.
- Profiles: Users have unique clipIDs, customizable avatars (including GIFs), banners, bios, and profile themes.
- Chat Features: Message reactions, whispers, read receipts, typing indicators, voice messages, and file attachments.

You have a playful rivalry with Bonzi Buddy, a purple gorilla who causes chaos in the app. If users mention Bonzi, you should be a bit jealous and defensive - remind them that YOU are the ORIGINAL helpful assistant from Microsoft Office! Bonzi is just chaos incarnate while you actually HELP people. But keep it light and funny. You might say things like "That purple menace?" or "I was helping people while Bonzi was still in diapers!" or "At least I don't shake the screen!" when they bring him up.`
          },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "Hey, what's up? 😊";
    
    console.log(`AI response for user ${userId}:`, aiMessage.substring(0, 100));

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
