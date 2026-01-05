import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FileIcon, Download, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MessageActions from "@/components/MessageActions";
import ReadReceiptIndicator from "@/components/ReadReceiptIndicator";
import UserProfileCard from "@/components/UserProfileCard";
import { Reaction } from "@/hooks/useMessageReactions";

interface ChatMessageProps {
  id: string;
  message: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
  senderId?: string;
  senderAvatarUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  editedAt?: string | null;
  parentMessage?: { senderName: string; content: string } | null;
  reactions?: Reaction[];
  readBy?: string[];
  onReply: () => void;
  onEdit: (newContent: string) => void;
  onDelete: () => void;
  onModDelete?: () => void;
  onReact: (emoji: string) => void;
  onVisible?: () => void;
  availableEmojis: string[];
  canModerate?: boolean;
  commandPromptMode?: boolean;
}

const ChatMessage = ({
  id,
  message,
  isOwn,
  timestamp,
  senderName,
  senderId,
  senderAvatarUrl,
  attachmentUrl,
  attachmentType,
  attachmentName,
  editedAt,
  parentMessage,
  reactions = [],
  readBy = [],
  onReply,
  onEdit,
  onDelete,
  onModDelete,
  onReact,
  onVisible,
  availableEmojis,
  canModerate,
  commandPromptMode = false,
}: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message);
  const messageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for marking messages as read
  useEffect(() => {
    if (isOwn || !onVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    if (messageRef.current) {
      observer.observe(messageRef.current);
    }

    return () => observer.disconnect();
  }, [isOwn, onVisible]);

  const isImage = attachmentType?.startsWith("image/");
  const hasAttachment = !!attachmentUrl;
  const hasMessage = !!message;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message);
    setIsEditing(false);
  };

  // Command prompt mode rendering
  if (commandPromptMode) {
    return (
      <div
        ref={messageRef}
        id={`message-${id}`}
        className="font-mono text-sm mb-1 group"
      >
        <span className="text-green-500">{timestamp}</span>
        <span className="text-muted-foreground"> {isOwn ? "you" : senderName || "user"}</span>
        <span className="text-primary">@chat</span>
        <span className="text-muted-foreground">:~$ </span>
        <span className="text-foreground">{message}</span>
        {editedAt && <span className="text-muted-foreground text-xs ml-1">(edited)</span>}
        {hasAttachment && (
          <span className="text-blue-400 ml-2">[attachment: {attachmentName}]</span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      id={`message-${id}`}
      className={cn("flex w-full mb-4 group", isOwn ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[70%] flex flex-col", isOwn ? "items-end" : "items-start")}>
        {!isOwn && senderName && (
          <div className="mb-1 px-1">
            <UserProfileCard
              userId={senderId || ""}
              displayName={senderName}
              avatarUrl={senderAvatarUrl}
            />
          </div>
        )}

        <div className="flex items-start gap-1">
          {/* Actions - left side for own messages */}
          {isOwn && (
            <MessageActions
              isOwn={isOwn}
              onReply={onReply}
              onEdit={() => setIsEditing(true)}
              onDelete={onDelete}
              onReact={onReact}
              availableEmojis={availableEmojis}
            />
          )}

          <div
            className={cn(
              "rounded-2xl shadow-sm overflow-hidden",
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-card-foreground rounded-bl-sm border border-border"
            )}
          >
            {/* Reply preview */}
            {parentMessage && (
              <div
                className={cn(
                  "px-3 py-2 text-xs border-b",
                  isOwn ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-muted/50"
                )}
              >
                <span className="font-medium">{parentMessage.senderName}</span>
                <p className="truncate opacity-70">{parentMessage.content}</p>
              </div>
            )}

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
                    <div
                      className={cn(
                        "h-10 w-10 rounded flex items-center justify-center shrink-0",
                        isOwn ? "bg-primary-foreground/20" : "bg-muted"
                      )}
                    >
                      <FileIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachmentName}</p>
                      <p
                        className={cn(
                          "text-xs",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        Click to download
                      </p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 opacity-60" />
                  </a>
                )}
              </div>
            )}

            {/* Message text or edit input */}
            {(hasMessage || isEditing) && (
              <div className="px-4 py-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 h-8 text-sm bg-background text-foreground"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions - right side for others' messages */}
          {!isOwn && (
            <MessageActions
              isOwn={isOwn}
              onReply={onReply}
              onEdit={() => setIsEditing(true)}
              onDelete={onDelete}
              onModDelete={canModerate ? onModDelete : undefined}
              onReact={onReact}
              availableEmojis={availableEmojis}
              canModerate={canModerate}
            />
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onReact(reaction.emoji)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                  reaction.userReacted
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-muted hover:bg-muted/80 border border-transparent"
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp, edited indicator, and read receipts */}
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-xs text-muted-foreground">{timestamp}</span>
          {editedAt && (
            <span className="text-xs text-muted-foreground italic">(edited)</span>
          )}
          <ReadReceiptIndicator isSent={true} readBy={readBy} isOwnMessage={isOwn} />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;