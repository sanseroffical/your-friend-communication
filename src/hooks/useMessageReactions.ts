import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface MessageReactions {
  [messageId: string]: Reaction[];
}

const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export function useMessageReactions(roomCode: string | null, userId: string) {
  const [reactions, setReactions] = useState<MessageReactions>({});

  const fetchReactions = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length) return;

    const { data, error } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);

    if (error) {
      console.error("Error fetching reactions:", error);
      return;
    }

    // Group reactions by message
    const grouped: MessageReactions = {};
    for (const messageId of messageIds) {
      grouped[messageId] = [];
    }

    if (data) {
      for (const reaction of data) {
        if (!grouped[reaction.message_id]) {
          grouped[reaction.message_id] = [];
        }
        
        const existing = grouped[reaction.message_id].find(r => r.emoji === reaction.emoji);
        if (existing) {
          existing.count++;
          if (reaction.user_id === userId) {
            existing.userReacted = true;
          }
        } else {
          grouped[reaction.message_id].push({
            emoji: reaction.emoji,
            count: 1,
            userReacted: reaction.user_id === userId,
          });
        }
      }
    }

    setReactions(grouped);
  }, [userId]);

  // Subscribe to reaction changes
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`reactions-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
          if (messageId) {
            // Refetch reactions for this message
            fetchReactions([messageId]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, fetchReactions]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId) return;

    const currentReactions = reactions[messageId] || [];
    const existing = currentReactions.find(r => r.emoji === emoji);
    
    if (existing?.userReacted) {
      // Remove reaction
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      // Add reaction
      await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        });
    }
  }, [userId, reactions]);

  return { reactions, fetchReactions, toggleReaction, AVAILABLE_EMOJIS };
}