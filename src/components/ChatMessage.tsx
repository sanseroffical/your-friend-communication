import { cn } from "@/lib/utils";
import { FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
}

const ChatMessage = ({ 
  message, 
  isOwn, 
  timestamp, 
  senderName,
  attachmentUrl,
  attachmentType,
  attachmentName,
}: ChatMessageProps) => {
  const isImage = attachmentType?.startsWith("image/");
  const hasAttachment = !!attachmentUrl;
  const hasMessage = !!message;

  return (
    <div className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
        {!isOwn && senderName && (
          <span className="text-xs text-muted-foreground mb-1 px-1">{senderName}</span>
        )}
        <div
          className={cn(
            "rounded-2xl shadow-sm overflow-hidden",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card text-card-foreground rounded-bl-sm border border-border"
          )}
        >
          {/* Attachment */}
          {hasAttachment && (
            <div className={cn(hasMessage && "border-b border-border/20")}>
              {isImage ? (
                <a href={attachmentUrl!} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={attachmentUrl!} 
                    alt={attachmentName || "Attachment"} 
                    className="max-w-full max-h-64 object-contain"
                  />
                </a>
              ) : (
                <a 
                  href={attachmentUrl!} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 hover:bg-black/5 transition-colors",
                    isOwn && "hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded flex items-center justify-center shrink-0",
                    isOwn ? "bg-primary-foreground/20" : "bg-muted"
                  )}>
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachmentName}</p>
                    <p className={cn(
                      "text-xs",
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      Click to download
                    </p>
                  </div>
                  <Download className="h-4 w-4 shrink-0 opacity-60" />
                </a>
              )}
            </div>
          )}
          
          {/* Message text */}
          {hasMessage && (
            <div className="px-4 py-3">
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">{timestamp}</span>
      </div>
    </div>
  );
};

export default ChatMessage;