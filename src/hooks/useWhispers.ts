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

    // Subscribe only to whisper rows involving the current user.
    const channel = supabase
      .channel(`whispers-${roomCode}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whispers",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newWhisper = payload.new as Whisper;
          if (newWhisper.room_code === roomCode) {
            setWhispers(prev => [...prev, newWhisper]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whispers",
          filter: `sender_id=eq.${userId}`,
        },
        (payload) => {
          const newWhisper = payload.new as Whisper;
          if (newWhisper.room_code === roomCode) {
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
