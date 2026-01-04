import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

interface WhisperMessageProps {
  content: string;
  senderName: string;
  timestamp: string;
  isFromMe: boolean;
}

const WhisperMessage = ({ content, senderName, timestamp, isFromMe }: WhisperMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-2",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 border-2 border-dashed",
          isFromMe
            ? "bg-purple-500/20 border-purple-500/50 text-foreground"
            : "bg-purple-500/10 border-purple-500/30 text-foreground"
        )}
      >
        <div className="flex items-center gap-1 text-xs text-purple-400 mb-1">
          <Eye className="h-3 w-3" />
          <span>Whisper {isFromMe ? "to" : "from"} {senderName}</span>
        </div>
        <p className="text-sm italic">{content}</p>
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
      </div>
    </div>
  );
};

export default WhisperMessage;
