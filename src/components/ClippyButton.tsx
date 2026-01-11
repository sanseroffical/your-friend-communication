import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ClippyAI from "./ClippyAI";

const ClippyButton = () => {
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
      <ClippyAI isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default ClippyButton;
