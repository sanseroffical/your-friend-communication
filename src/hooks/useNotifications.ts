import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null;
    
    // Don't send if document is visible
    if (document.visibilityState === 'visible') return null;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const notifyNewMessage = useCallback((senderName: string, message: string, roomCode: string) => {
    return sendNotification(`${senderName} in ${roomCode}`, {
      body: message.length > 100 ? message.slice(0, 100) + '...' : message,
      tag: `message-${roomCode}`, // Group notifications by room
    });
  }, [sendNotification]);

  const notifyMention = useCallback((senderName: string, roomCode: string) => {
    return sendNotification(`${senderName} mentioned you!`, {
      body: `You were mentioned in room ${roomCode}`,
      tag: `mention-${Date.now()}`,
      requireInteraction: true,
    });
  }, [sendNotification]);

  const notifyCall = useCallback((callerName: string, roomCode: string, isVideo: boolean) => {
    return sendNotification(`Incoming ${isVideo ? 'Video' : 'Voice'} Call`, {
      body: `${callerName} is calling in room ${roomCode}`,
      tag: `call-${roomCode}`,
      requireInteraction: true,
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyNewMessage,
    notifyMention,
    notifyCall,
  };
}
