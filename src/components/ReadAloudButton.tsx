import { useEffect, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { supabase } from "@/integrations/supabase/client";

interface ReadAloudButtonProps {
  /** When provided, the floating selection button is gated on this user's screen_reader_mode. */
  userId?: string | null;
  /** Force-enable the floating selection button regardless of user setting. */
  forceEnabled?: boolean;
}

interface FloatingState {
  text: string;
  x: number;
  y: number;
}

const MAX_LEN = 1500;

const ReadAloudButton = ({ userId, forceEnabled = false }: ReadAloudButtonProps) => {
  const { speak, stop, isLoading, isPlaying } = useTextToSpeech();
  const [enabled, setEnabled] = useState(forceEnabled);
  const [floating, setFloating] = useState<FloatingState | null>(null);

  // Pull screen_reader_mode preference
  useEffect(() => {
    if (forceEnabled) {
      setEnabled(true);
      return;
    }
    if (!userId) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_settings")
      .select("screen_reader_mode")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setEnabled(Boolean(data?.screen_reader_mode));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, forceEnabled]);

  // Selection listener
  useEffect(() => {
    if (!enabled) {
      setFloating(null);
      return;
    }

    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setFloating(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setFloating(null);
        return;
      }
      // Skip selections inside form fields
      const anchor = sel.anchorNode as Node | null;
      const el = (anchor && anchor.nodeType === 1 ? anchor : anchor?.parentElement) as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable='true']")) {
        setFloating(null);
        return;
      }
      const range = sel.getRangeAt(0).getBoundingClientRect();
      if (!range || (range.width === 0 && range.height === 0)) {
        setFloating(null);
        return;
      }
      setFloating({
        text: text.slice(0, MAX_LEN),
        x: Math.min(window.innerWidth - 160, Math.max(8, range.left + range.width / 2 - 70)),
        y: Math.max(8, range.top - 44),
      });
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [enabled]);

  if (!enabled || !floating) return null;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) {
      stop();
    } else {
      speak(floating.text);
    }
  };

  return (
    <div
      className="fixed z-[100] animate-fade-in"
      style={{ top: floating.y, left: floating.x }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button
        size="sm"
        variant="default"
        className="h-9 gap-2 shadow-lg"
        onClick={onClick}
        aria-label={isPlaying ? "Stop reading" : "Read selection aloud"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Square className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {isPlaying ? "Stop" : "Read aloud"}
      </Button>
    </div>
  );
};

export default ReadAloudButton;
