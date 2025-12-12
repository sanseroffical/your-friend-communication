import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReadReceipt {
  message_id: string;
  user_id: string;
  read_at: string;
}

export const useReadReceipts = (roomCode: string, userId: string) => {
  const [readReceipts, setReadReceipts] = useState<Map<string, string[]>>(new Map());

  // Fetch initial read receipts for messages in this room
  const fetchReadReceipts = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const { data, error } = await supabase
      .from('read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds);

    if (!error && data) {
      const receiptsMap = new Map<string, string[]>();
      data.forEach((receipt) => {
        const existing = receiptsMap.get(receipt.message_id) || [];
        if (!existing.includes(receipt.user_id)) {
          existing.push(receipt.user_id);
          receiptsMap.set(receipt.message_id, existing);
        }
      });
      setReadReceipts(receiptsMap);
    }
  }, []);

  // Mark a message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('read_receipts')
      .upsert({
        message_id: messageId,
        user_id: userId,
      }, {
        onConflict: 'message_id,user_id',
      });

    if (!error) {
      setReadReceipts(prev => {
        const updated = new Map(prev);
        const existing = updated.get(messageId) || [];
        if (!existing.includes(userId)) {
          updated.set(messageId, [...existing, userId]);
        }
        return updated;
      });
    }
  }, [userId]);

  // Subscribe to real-time read receipt changes
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase
      .channel('read-receipts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'read_receipts',
        },
        (payload) => {
          const receipt = payload.new as ReadReceipt;
          setReadReceipts(prev => {
            const updated = new Map(prev);
            const existing = updated.get(receipt.message_id) || [];
            if (!existing.includes(receipt.user_id)) {
              updated.set(receipt.message_id, [...existing, receipt.user_id]);
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  const getReadBy = useCallback((messageId: string): string[] => {
    return readReceipts.get(messageId) || [];
  }, [readReceipts]);

  return { readReceipts, fetchReadReceipts, markAsRead, getReadBy };
};
