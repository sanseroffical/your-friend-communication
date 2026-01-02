import { useState, useEffect } from 'react';
import { Bot, Shield, ShieldOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ModerationBotPanelProps {
  isAdmin: boolean;
  roomCode: string;
}

const ModerationBotPanel = ({ isAdmin, roomCode }: ModerationBotPanelProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load persisted bot state for this room from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`modbot-${roomCode}`);
    if (stored !== null) {
      setIsActive(stored === 'true');
    }
    setIsLoading(false);
  }, [roomCode]);

  const toggleBot = async () => {
    const newState = !isActive;
    setIsActive(newState);
    localStorage.setItem(`modbot-${roomCode}`, String(newState));

    // Send a system message to the room
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('messages').insert({
          room_code: roomCode,
          sender_name: '🤖 System',
          content: newState
            ? '🛡️ Moderation Bot has been enabled. Messages will now be automatically moderated.'
            : '⚠️ Moderation Bot has been disabled. Messages are no longer moderated.',
          user_id: user.id,
        });
      }
    } catch (error) {
      console.error('Error sending bot notification:', error);
    }

    toast({
      title: newState ? 'Moderation Bot Enabled' : 'Moderation Bot Disabled',
      description: newState
        ? 'Messages will now be automatically moderated'
        : 'Automatic moderation is now off',
    });
  };

  if (!isAdmin) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          title="Moderation Bot"
        >
          <Bot className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Moderation Bot
          </SheetTitle>
          <SheetDescription>
            Automatic message moderation for this room
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              The moderation bot automatically filters profanity, detects spam, and enforces chat rules.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              {isActive ? (
                <Shield className="h-8 w-8 text-primary" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base font-medium">
                  {isActive ? 'Bot Active' : 'Bot Inactive'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isActive ? 'Moderating messages' : 'Messages unmoderated'}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={toggleBot}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">What the bot does:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Filters profanity and replaces with asterisks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Detects and warns about spam messages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Reduces excessive CAPS to lowercase</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Enforces message length limits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Rate limits rapid message sending</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card">
            <h4 className="font-medium mb-2">Rate Limits</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span>Max messages/min:</span>
              <span className="font-mono">10</span>
              <span>Max duplicates:</span>
              <span className="font-mono">3</span>
              <span>Max message length:</span>
              <span className="font-mono">2000</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ModerationBotPanel;