import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SmartRepliesProps {
  lastMessages: Array<{ role: string; content: string }>;
  onSelectReply: (reply: string) => void;
  visible: boolean;
}

const SmartReplies = ({ lastMessages, onSelectReply, visible }: SmartRepliesProps) => {
  const [replies, setReplies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState("");

  useEffect(() => {
    if (!visible || lastMessages.length === 0) return;
    
    const lastMsg = lastMessages[lastMessages.length - 1]?.content || "";
    if (lastMsg === lastFetched || !lastMsg) return;

    const fetchReplies = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-features", {
          body: {
            action: "smart_replies",
            recent_messages: lastMessages.slice(-5),
          },
        });

        if (!error && data?.replies && Array.isArray(data.replies)) {
          setReplies(data.replies.slice(0, 3));
          setLastFetched(lastMsg);
        }
      } catch {
        // Silently fail - smart replies are optional
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchReplies, 1000);
    return () => clearTimeout(timer);
  }, [lastMessages, visible, lastFetched]);

  if (!visible || (replies.length === 0 && !isLoading)) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto">
      <Zap className="h-3 w-3 text-primary shrink-0" />
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : (
        replies.map((reply, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2 shrink-0 whitespace-nowrap"
            onClick={() => onSelectReply(reply)}
          >
            {reply}
          </Button>
        ))
      )}
    </div>
  );
};

export default SmartReplies;
