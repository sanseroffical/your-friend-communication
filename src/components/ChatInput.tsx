import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileIcon, Reply, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { containsProfanity } from "@/utils/profanityFilter";
import { useMentions } from "@/hooks/useMentions";
import MentionSuggestions from "@/components/MentionSuggestions";
import EmojiStickerPicker from "@/components/chat/EmojiStickerPicker";
import { getStorageRef } from "@/hooks/useSignedStorageUrl";

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
  onProcessCommand?: (input: string) => Promise<{ handled: boolean; message?: string }>;
  commandPromptMode?: boolean;
  promptUser?: string;
}

const ChatInput = ({ onSend, disabled, replyTo, onCancelReply, onTyping, onProcessCommand, commandPromptMode, promptUser }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { suggestions, isLoading: mentionsLoading, searchUsers, clearSuggestions, getMentionAtCursor } = useMentions();

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
    // Get current user for folder-based access control
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive",
      });
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`; // Add user folder prefix for RLS compliance

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

    return {
      url: getStorageRef("chat-attachments", filePath),
      type: file.type,
      name: file.name,
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Upload and send
        setIsUploading(true);
        const uploaded = await uploadFile(file);
        if (uploaded) {
          onSend("🎤 Voice message", uploaded, replyTo?.id);
          onCancelReply?.();
        }
        setIsUploading(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice messages.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      audioChunksRef.current = [];
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !attachment) || disabled || isUploading) return;

    const messageToSend = message.trim();

    // Process commands first
    if (messageToSend.startsWith('/') && onProcessCommand) {
      const result = await onProcessCommand(messageToSend);
      if (result.handled) {
        if (result.message) {
          toast({ title: "Command", description: result.message });
        }
        setMessage("");
        return;
      }
    }

    // Check for profanity
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
    const value = e.target.value;
    setMessage(value);
    onTyping?.();
    
    // Check for mention
    const cursorPos = e.target.selectionStart || value.length;
    const mentionQuery = getMentionAtCursor(value, cursorPos);
    if (mentionQuery !== null) {
      setShowMentions(true);
      searchUsers(mentionQuery);
    } else {
      setShowMentions(false);
      clearSuggestions();
    }
  };

  const handleSelectMention = (user: { clip_id: string }) => {
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const beforeCursor = message.slice(0, cursorPos);
    const afterCursor = message.slice(cursorPos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const newMessage = beforeCursor.slice(0, -mentionMatch[0].length) + `@${user.clip_id} ` + afterCursor;
      setMessage(newMessage);
    }
    setShowMentions(false);
    clearSuggestions();
    inputRef.current?.focus();
  };

  const isImage = attachment?.file.type.startsWith("image/");

  if (commandPromptMode) {
    return (
      <form onSubmit={handleSubmit} className="bg-background border-t border-primary/40 font-mono">
        {replyTo && (
          <div className="px-4 pt-2 text-xs text-primary/80">
            # replying to {replyTo.senderName}: {replyTo.content.slice(0, 60)}
            <button type="button" onClick={onCancelReply} className="ml-2 underline">[cancel]</button>
          </div>
        )}
        <div className="flex items-center gap-1 px-3 py-2 text-sm">
          <span className="text-primary shrink-0">{promptUser || "user"}@chat</span>
          <span className="text-muted-foreground shrink-0">:~$</span>
          <input
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            placeholder="type message or /help"
            disabled={disabled || isUploading}
            className="flex-1 bg-transparent outline-none border-0 text-foreground placeholder:text-muted-foreground/60 font-mono"
            autoFocus
          />
          <span className="inline-block w-2 h-4 bg-primary animate-pulse" aria-hidden />
        </div>
      </form>
    );
  }

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
      <div className="relative flex items-center gap-2 p-4">
        {showMentions && (
          <MentionSuggestions 
            suggestions={suggestions} 
            onSelect={handleSelectMention}
            isLoading={mentionsLoading}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.mp4,.mov,.avi,.webm"
        />
        
        {isRecording ? (
          <>
            <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-lg px-4 py-2">
              <div className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
              <span className="text-sm text-muted-foreground">Recording...</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={stopRecording}
              className="shrink-0 bg-destructive hover:bg-destructive/90"
            >
              <Square className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startRecording}
              disabled={disabled || isUploading}
              className="shrink-0"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <EmojiStickerPicker
              onSelect={(value, type) => {
                if (type === 'emoji') {
                  setMessage(m => m + value);
                  inputRef.current?.focus();
                } else {
                  // Stickers are sent as messages
                  onSend(value, undefined, replyTo?.id);
                  onCancelReply?.();
                }
              }}
            />
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message or /help for commands..."
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
          </>
        )}
      </div>
    </form>
  );
};

export default ChatInput;