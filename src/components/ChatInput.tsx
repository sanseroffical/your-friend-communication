import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileIcon, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { containsProfanity, filterProfanity } from "@/utils/profanityFilter";

interface Attachment {
  file: File;
  preview?: string;
}

interface ReplyTo {
  id: string;
  senderName: string;
  content: string;
}

interface ChatInputProps {
  onSend: (message: string, attachment?: { url: string; type: string; name: string }, replyToId?: string) => void;
  disabled?: boolean;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

const ChatInput = ({ onSend, disabled, replyTo, onCancelReply, onTyping }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }

    const preview = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    setAttachment({ file, preview });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = () => {
    if (attachment?.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  };

  const uploadFile = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload file. Please try again.",
        variant: "destructive",
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      type: file.type,
      name: file.name,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || disabled || isUploading) return;

    // Check for profanity
    const messageToSend = message.trim();
    if (messageToSend && containsProfanity(messageToSend)) {
      toast({
        title: "Message blocked",
        description: "Your message contains inappropriate language. Please rephrase it.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let attachmentData: { url: string; type: string; name: string } | undefined;

      if (attachment) {
        const uploaded = await uploadFile(attachment.file);
        if (uploaded) {
          attachmentData = uploaded;
        }
        removeAttachment();
      }

      onSend(messageToSend || (attachmentData ? "" : ""), attachmentData, replyTo?.id);
      setMessage("");
      onCancelReply?.();
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const isImage = attachment?.file.type.startsWith("image/");

  return (
    <form onSubmit={handleSubmit} className="bg-card border-t border-border">
      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg p-2 text-sm">
            <Reply className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{replyTo.senderName}</span>
              <p className="truncate text-muted-foreground">{replyTo.content}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="px-4 pt-3">
          <div className="inline-flex items-center gap-2 bg-muted rounded-lg p-2 pr-3">
            {isImage && attachment.preview ? (
              <img
                src={attachment.preview}
                alt="Preview"
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{attachment.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(attachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={removeAttachment}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.mp4,.mov,.avi,.webm"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          ref={inputRef}
          value={message}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 bg-background border-border focus-visible:ring-primary"
          disabled={disabled || isUploading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!message.trim() && !attachment) || disabled || isUploading}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;