import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
}

const ChatMessage = ({ message, isOwn, timestamp, senderName }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
        {!isOwn && senderName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">{senderName}</span>
        )}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl shadow-sm",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card text-card-foreground rounded-bl-sm border border-border"
          )}
        >
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">{timestamp}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
