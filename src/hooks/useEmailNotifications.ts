import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type NotificationType = 'level_up' | 'quest_complete' | 'friend_request' | 'mention' | 'message';

interface NotificationData {
  userName?: string;
  level?: number;
  questTitle?: string;
  xpReward?: number;
  senderName?: string;
  roomCode?: string;
  message?: string;
}

export function useEmailNotifications() {
  const sendNotification = useCallback(async (
    email: string,
    type: NotificationType,
    data: NotificationData
  ) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('send-notification', {
        body: { email, type, data },
      });

      if (error) throw error;
      return response;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return null;
    }
  }, []);

  const notifyLevelUp = useCallback((email: string, userName: string, level: number) => {
    return sendNotification(email, 'level_up', { userName, level });
  }, [sendNotification]);

  const notifyQuestComplete = useCallback((email: string, questTitle: string, xpReward: number) => {
    return sendNotification(email, 'quest_complete', { questTitle, xpReward });
  }, [sendNotification]);

  const notifyFriendRequest = useCallback((email: string, senderName: string) => {
    return sendNotification(email, 'friend_request', { senderName });
  }, [sendNotification]);

  const notifyMention = useCallback((email: string, senderName: string, roomCode: string) => {
    return sendNotification(email, 'mention', { senderName, roomCode });
  }, [sendNotification]);

  return {
    sendNotification,
    notifyLevelUp,
    notifyQuestComplete,
    notifyFriendRequest,
    notifyMention,
  };
}
