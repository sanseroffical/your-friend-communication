import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingUser {
  user_id: string;
  user_name: string;
}

export function useTypingIndicator(roomCode: string | null, userId: string, userName: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing status changes
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel(`typing-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `room_code=eq.${roomCode}`,
        },
        async () => {
          // Refetch typing users
          const { data } = await supabase
            .from("typing_status")
            .select("user_id, user_name")
            .eq("room_code", roomCode)
            .neq("user_id", userId)
            .gte("updated_at", new Date(Date.now() - 5000).toISOString());
          
          setTypingUsers(data || []);
        }
      )
      .subscribe();

    // Initial fetch
    const fetchTyping = async () => {
      const { data } = await supabase
        .from("typing_status")
        .select("user_id, user_name")
        .eq("room_code", roomCode)
        .neq("user_id", userId)
        .gte("updated_at", new Date(Date.now() - 5000).toISOString());
      
      setTypingUsers(data || []);
    };
    fetchTyping();

    // Poll to remove stale typing indicators
    const pollInterval = setInterval(fetchTyping, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [roomCode, userId]);

  // Set typing status
  const setTyping = useCallback(async () => {
    if (!roomCode || !userId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update typing status
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await supabase
        .from("typing_status")
        .upsert({
          room_code: roomCode,
          user_id: userId,
          user_name: userName,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "room_code,user_id",
        });
    } else {
      // Just update the timestamp
      await supabase
        .from("typing_status")
        .update({ updated_at: new Date().toISOString() })
        .eq("room_code", roomCode)
        .eq("user_id", userId);
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      isTypingRef.current = false;
      await supabase
        .from("typing_status")
        .delete()
        .eq("room_code", roomCode)
        .eq("user_id", userId);
    }, 3000);
  }, [roomCode, userId, userName]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (roomCode && userId) {
        supabase
          .from("typing_status")
          .delete()
          .eq("room_code", roomCode)
          .eq("user_id", userId);
      }
    };
  }, [roomCode, userId]);

  return { typingUsers, setTyping };
}