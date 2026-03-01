import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Send, Loader2, Sparkles, X, Star, 
  ThumbsUp, ThumbsDown, Minus, MessageSquare
} from "lucide-react";

interface FeedbackPanelProps {
  onClose?: () => void;
}

const SENTIMENT_DISPLAY: Record<string, { icon: typeof Star; color: string }> = {
  positive: { icon: ThumbsUp, color: "text-green-400" },
  negative: { icon: ThumbsDown, color: "text-red-400" },
  neutral: { icon: Minus, color: "text-muted-foreground" },
  mixed: { icon: MessageSquare, color: "text-yellow-400" },
};

const FeedbackPanel = ({ onClose }: FeedbackPanelProps) => {
  const [content, setContent] = useState("");
  const [feedbackType, setFeedbackType] = useState("general");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setAnalysis(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Get AI analysis
      const { data: aiData } = await supabase.functions.invoke("ai-features", {
        body: { action: "analyze_feedback", content: content.trim(), feedback_type: feedbackType },
      });

      const aiAnalysis = aiData?.analysis;
      setAnalysis(aiAnalysis);

      // Save feedback
      await (supabase.from("user_feedback") as any).insert({
        user_id: user.id,
        content: content.trim(),
        feedback_type: feedbackType,
        rating: rating || null,
        ai_summary: aiAnalysis?.summary || null,
        ai_sentiment: aiAnalysis?.sentiment || null,
      });

      toast({ title: "Thanks!", description: "Your feedback has been analyzed and saved" });
      setContent("");
      setRating(0);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">AI Feedback</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={feedbackType} onValueChange={setFeedbackType}>
          <SelectTrigger>
            <SelectValue placeholder="Feedback type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Idea</SelectItem>
            <SelectItem value="ux">User Experience</SelectItem>
            <SelectItem value="praise">Praise</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Button
              key={s}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRating(s === rating ? 0 : s)}
            >
              <Star className={`h-4 w-4 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </Button>
          ))}
        </div>

        <Textarea
          placeholder="Share your thoughts, ideas, or report issues..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          disabled={submitting}
        />

        <Button onClick={handleSubmit} disabled={!content.trim() || submitting} className="w-full">
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />Submit & Analyze</>
          )}
        </Button>

        {analysis && (
          <Card className="border bg-muted/30">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Analysis
              </div>
              {analysis.summary && (
                <p className="text-xs text-muted-foreground">{analysis.summary}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                {analysis.sentiment && (
                  <Badge variant="outline" className="text-[10px]">
                    {(() => {
                      const s = SENTIMENT_DISPLAY[analysis.sentiment];
                      const Icon = s?.icon || Minus;
                      return <><Icon className={`h-3 w-3 mr-1 ${s?.color || ""}`} />{analysis.sentiment}</>;
                    })()}
                  </Badge>
                )}
                {analysis.category && (
                  <Badge variant="outline" className="text-[10px]">{analysis.category}</Badge>
                )}
              </div>
              {analysis.actionable_suggestions && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Suggestions:</p>
                  {analysis.actionable_suggestions.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackPanel;
