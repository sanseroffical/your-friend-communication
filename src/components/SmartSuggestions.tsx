import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, Loader2, X, Gamepad2, MessageSquare, 
  Users, Trophy, Palette, ChevronRight, Brain
} from "lucide-react";

interface Suggestion {
  title: string;
  description: string;
  type: string;
  action_path: string;
  priority: string;
}

interface SmartSuggestionsProps {
  onNavigate?: (path: string) => void;
  onClose?: () => void;
}

const TYPE_ICONS: Record<string, typeof Sparkles> = {
  feature_discovery: Sparkles,
  engagement: Trophy,
  social: Users,
  achievement: Trophy,
  customization: Palette,
};

const PATH_ICONS: Record<string, typeof Sparkles> = {
  games: Gamepad2,
  social: Users,
  chat: MessageSquare,
  profile: Palette,
  quests: Trophy,
  friends: Users,
};

const SmartSuggestions = ({ onNavigate, onClose }: SmartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-features", {
        body: { action: "get_smart_suggestions" },
      });
      if (error) throw error;
      if (Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions);
      } else if (typeof data?.suggestions === "string") {
        // AI returned string instead of parsed JSON
        try {
          setSuggestions(JSON.parse(data.suggestions));
        } catch {
          setSuggestions([]);
        }
      }
    } catch (e) {
      console.error("Failed to load suggestions:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">For You</CardTitle>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={loadSuggestions} disabled={loading} className="text-xs">
            Refresh
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">AI is personalizing suggestions...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Use the app more and I'll learn your preferences!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => {
                const TypeIcon = TYPE_ICONS[s.type] || Sparkles;
                const PathIcon = PATH_ICONS[s.action_path] || ChevronRight;
                return (
                  <Card
                    key={i}
                    className="cursor-pointer hover:bg-accent/50 transition-colors border"
                    onClick={() => onNavigate?.(s.action_path)}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <PathIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-medium">{s.title}</h4>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {s.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SmartSuggestions;
