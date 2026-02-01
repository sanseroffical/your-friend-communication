import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';

interface PinnedMessage {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
  pinnedBy: string;
  pinnedAt: string;
}

interface PinnedMessagesProps {
  pinnedMessages: PinnedMessage[];
  onUnpin?: (messageId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  canManage?: boolean;
}

const PinnedMessages = ({ pinnedMessages, onUnpin, onJumpToMessage, canManage = false }: PinnedMessagesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (pinnedMessages.length > 0 && currentIndex >= pinnedMessages.length) {
      setCurrentIndex(pinnedMessages.length - 1);
    }
  }, [pinnedMessages.length, currentIndex]);

  if (pinnedMessages.length === 0) return null;

  const currentMessage = pinnedMessages[currentIndex];

  const cycleMessage = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
    }
  };

  return (
    <div className="bg-accent/50 border-b border-border">
      {!isExpanded ? (
        <div className="flex items-center gap-2 px-4 py-2">
          <Pin className="w-4 h-4 text-primary shrink-0" />
          <button
            onClick={() => onJumpToMessage?.(currentMessage.id)}
            className="flex-1 text-left text-sm truncate hover:text-primary transition-colors"
          >
            <span className="font-medium">{currentMessage.senderName}: </span>
            <span className="text-muted-foreground">{currentMessage.content}</span>
          </button>
          {pinnedMessages.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => cycleMessage('prev')}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[3ch] text-center">
                {currentIndex + 1}/{pinnedMessages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => cycleMessage('next')}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
          >
            View All
          </Button>
        </div>
      ) : (
        <Card className="m-2 shadow-lg">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pin className="w-4 h-4 text-primary" />
              Pinned Messages ({pinnedMessages.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-48">
              <div className="space-y-1 p-2">
                {pinnedMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-2 p-2 rounded-lg hover:bg-accent transition-colors ${
                      index === currentIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        setCurrentIndex(index);
                        onJumpToMessage?.(message.id);
                        setIsExpanded(false);
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm">
                        <span className="font-medium">{message.senderName}</span>
                        <span className="text-muted-foreground mx-1">•</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.content}
                      </p>
                    </button>
                    {canManage && onUnpin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
                        onClick={() => onUnpin(message.id)}
                        title="Unpin message"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PinnedMessages;
