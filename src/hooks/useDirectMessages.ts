import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  sender_profile?: {
    display_name: string | null;
    clip_id: string;
    avatar_url: string | null;
  };
  recipient_profile?: {
    display_name: string | null;
    clip_id: string;
    avatar_url: string | null;
  };
}

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerClipId: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const useDirectMessages = (userId: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, DirectMessage[]>();
      
      for (const msg of data || []) {
        const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, []);
        }
        conversationMap.get(partnerId)!.push(msg);
      }

      // Fetch partner profiles
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, clip_id, avatar_url")
        .in("id", partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const convos: Conversation[] = partnerIds.map(partnerId => {
        const msgs = conversationMap.get(partnerId)!;
        const lastMsg = msgs[0];
        const profile = profileMap.get(partnerId);
        const unreadCount = msgs.filter(m => 
          m.recipient_id === userId && !m.read_at
        ).length;

        return {
          partnerId,
          partnerName: profile?.display_name || "Unknown",
          partnerClipId: profile?.clip_id || "",
          partnerAvatar: profile?.avatar_url || null,
          lastMessage: lastMsg.content,
          lastMessageTime: lastMsg.created_at,
          unreadCount,
        };
      });

      convos.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!userId || !partnerId) return;
    
    setActivePartnerId(partnerId);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark unread messages as read
      const unreadIds = (data || [])
        .filter(m => m.recipient_id === userId && !m.read_at)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("direct_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Send a message
  const sendMessage = async (recipientId: string, content: string) => {
    if (!userId || !content.trim()) return;

    try {
      const { error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          content: content.trim(),
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Find user by clipID
  const findUserByClipId = async (clipId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, clip_id, avatar_url")
        .eq("clip_id", clipId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error finding user:", error);
      return null;
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("dm-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          if (newMsg.sender_id === userId || newMsg.recipient_id === userId) {
            fetchConversations();
            if (activePartnerId) {
              const partnerId = newMsg.sender_id === userId 
                ? newMsg.recipient_id 
                : newMsg.sender_id;
              if (partnerId === activePartnerId) {
                setMessages(prev => [...prev, newMsg]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activePartnerId, fetchConversations]);

  return {
    conversations,
    messages,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    findUserByClipId,
    activePartnerId,
    setActivePartnerId,
  };
};
