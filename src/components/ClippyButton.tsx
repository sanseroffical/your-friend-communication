import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ClippyAI from "./ClippyAI";

interface ClippyButtonProps {
  roomCode?: string | null;
  roomMessages?: Array<{ senderName: string; content: string }>;
}

const ClippyButton = ({ roomCode, roomMessages }: ClippyButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-[60] bg-primary hover:bg-primary/90"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
      <ClippyAI 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        roomCode={roomCode}
        roomMessages={roomMessages}
      />
    </>
  );
};

export default ClippyButton;
