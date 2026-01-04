import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Whisper {
  id: string;
  room_code: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export const useWhispers = (roomCode: string | null, userId: string) => {
  const [whispers, setWhispers] = useState<Whisper[]>([]);

  const sendWhisper = async (recipientId: string, content: string) => {
    if (!roomCode || !userId || !content.trim()) return;

    try {
      const { error } = await supabase
        .from("whispers")
        .insert({
          room_code: roomCode,
          sender_id: userId,
          recipient_id: recipientId,
          content: content.trim(),
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending whisper:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!roomCode || !userId) return;

    // Load existing whispers
    const loadWhispers = async () => {
      const { data, error } = await supabase
        .from("whispers")
        .select("*")
        .eq("room_code", roomCode)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading whispers:", error);
        return;
      }

      setWhispers(data || []);
    };

    loadWhispers();

    // Subscribe to new whispers
    const channel = supabase
      .channel(`whispers-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whispers",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const newWhisper = payload.new as Whisper;
          if (newWhisper.sender_id === userId || newWhisper.recipient_id === userId) {
            setWhispers(prev => [...prev, newWhisper]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, userId]);

  return { whispers, sendWhisper };
};
