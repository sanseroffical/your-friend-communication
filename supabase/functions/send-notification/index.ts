import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("Resend");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  email: string;
  type: 'level_up' | 'quest_complete' | 'friend_request' | 'mention' | 'message';
  data: {
    userName?: string;
    level?: number;
    questTitle?: string;
    xpReward?: number;
    senderName?: string;
    roomCode?: string;
    message?: string;
  };
}

const getEmailContent = (type: string, data: NotificationRequest['data']) => {
  switch (type) {
    case 'level_up':
      return {
        subject: `🎉 You reached Level ${data.level}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
            <h1 style="color: white; text-align: center;">🎮 Level Up!</h1>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h2 style="color: #667eea; text-align: center;">Congratulations, ${data.userName}!</h2>
              <p style="text-align: center; font-size: 48px; margin: 20px 0;">⭐</p>
              <p style="text-align: center; font-size: 24px; color: #333;">You've reached <strong>Level ${data.level}</strong>!</p>
              <p style="text-align: center; color: #666;">Keep up the great work and continue your journey!</p>
            </div>
          </div>
        `,
      };
    case 'quest_complete':
      return {
        subject: `✅ Quest Completed: ${data.questTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 10px;">
            <h1 style="color: white; text-align: center;">🏆 Quest Complete!</h1>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h2 style="color: #11998e; text-align: center;">${data.questTitle}</h2>
              <p style="text-align: center; font-size: 48px; margin: 20px 0;">🎯</p>
              <p style="text-align: center; font-size: 20px; color: #333;">You earned <strong>+${data.xpReward} XP</strong>!</p>
              <p style="text-align: center; color: #666;">Check out your quest log for more challenges!</p>
            </div>
          </div>
        `,
      };
    case 'friend_request':
      return {
        subject: `👋 ${data.senderName} sent you a friend request!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 10px;">
            <h1 style="color: white; text-align: center;">New Friend Request!</h1>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="text-align: center; font-size: 48px; margin: 20px 0;">👥</p>
              <p style="text-align: center; font-size: 20px; color: #333;"><strong>${data.senderName}</strong> wants to be your friend!</p>
              <p style="text-align: center; color: #666;">Log in to accept or decline the request.</p>
            </div>
          </div>
        `,
      };
    case 'mention':
      return {
        subject: `💬 ${data.senderName} mentioned you!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 10px;">
            <h1 style="color: white; text-align: center;">You were mentioned!</h1>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <p style="text-align: center; font-size: 48px; margin: 20px 0;">@</p>
              <p style="text-align: center; font-size: 20px; color: #333;"><strong>${data.senderName}</strong> mentioned you in room <strong>${data.roomCode}</strong></p>
              <p style="text-align: center; color: #666;">Join the conversation!</p>
            </div>
          </div>
        `,
      };
    default:
      return {
        subject: `📩 New notification`,
        html: `<p>You have a new notification. Log in to check it out!</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, data }: NotificationRequest = await req.json();

    if (!email || !type) {
      throw new Error("Missing required fields: email and type");
    }

    if (!RESEND_API_KEY) {
      throw new Error("Resend API key not configured");
    }

    const { subject, html } = getEmailContent(type, data);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Clip Chat <notifications@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
