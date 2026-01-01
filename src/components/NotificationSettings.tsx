import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

const NotificationSettings = () => {
  const { isSupported, permission, requestPermission } = useNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (permission === 'granted') {
      toast({
        title: 'Notifications Enabled',
        description: 'You will receive notifications for new messages',
      });
      return;
    }

    if (permission === 'denied') {
      toast({
        title: 'Notifications Blocked',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      });
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      toast({
        title: 'Notifications Enabled!',
        description: 'You will now receive notifications for new messages',
      });
    } else {
      toast({
        title: 'Notifications Denied',
        description: 'You can enable them later in browser settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="text-muted-foreground hover:text-foreground"
      title={
        permission === 'granted' 
          ? 'Notifications enabled' 
          : permission === 'denied'
            ? 'Notifications blocked'
            : 'Enable notifications'
      }
    >
      {permission === 'granted' ? (
        <BellRing className="h-5 w-5" />
      ) : permission === 'denied' ? (
        <BellOff className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
    </Button>
  );
};

export default NotificationSettings;
