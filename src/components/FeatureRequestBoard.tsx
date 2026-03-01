import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeatureRequests } from "@/hooks/useFeatureRequests";
import { 
  ThumbsUp, Send, Sparkles, Loader2, Lightbulb, 
  ArrowUp, Zap, Target, Star, X 
} from "lucide-react";

interface FeatureRequestBoardProps {
  onClose?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  chat: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  social: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  games: "bg-green-500/10 text-green-400 border-green-500/20",
  ui: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  profile: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  other: "bg-muted text-muted-foreground",
};

const PRIORITY_ICONS: Record<string, typeof Star> = {
  critical: Zap,
  high: ArrowUp,
  medium: Target,
  low: Lightbulb,
};

const FeatureRequestBoard = ({ onClose }: FeatureRequestBoardProps) => {
  const { requests, loading, submitRequest, toggleVote } = useFeatureRequests();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("browse");

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    await submitRequest(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setSubmitting(false);
    setTab("browse");
  };

  const parseAnalysis = (analysis: string | null) => {
    if (!analysis) return null;
    try { return JSON.parse(analysis); } catch { return null; }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Feature Board</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="browse" className="flex-1">Browse ({requests.length})</TabsTrigger>
            <TabsTrigger value="submit" className="flex-1">Submit Idea</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="m-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No feature requests yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const analysis = parseAnalysis(req.ai_analysis);
                    const PriorityIcon = PRIORITY_ICONS[req.ai_priority || "medium"] || Target;
                    return (
                      <Card key={req.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <Button
                              variant={req.voted ? "default" : "outline"}
                              size="sm"
                              className="flex flex-col items-center h-auto py-2 px-3 shrink-0"
                              onClick={() => toggleVote(req.id, !!req.voted)}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-xs mt-1">{req.upvotes}</span>
                            </Button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-medium text-sm">{req.title}</h4>
                                <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[req.category] || CATEGORY_COLORS.other}`}>
                                  {req.category}
                                </Badge>
                                {req.ai_priority && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <PriorityIcon className="h-3 w-3" />
                                    {req.ai_priority}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                              {analysis?.implementation_idea && (
                                <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
                                  <span className="font-medium text-primary">AI Idea:</span>{" "}
                                  {analysis.implementation_idea}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-muted-foreground">
                                  by {req.profile?.display_name || "Anonymous"}
                                </span>
                                <Badge variant="outline" className="text-[10px]">{req.status}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="submit" className="m-0 space-y-4">
            <div className="p-3 bg-primary/5 rounded-lg text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 inline mr-1 text-primary" />
              AI will automatically analyze your request, categorize it, and suggest implementation ideas!
            </div>
            <Input
              placeholder="Feature title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            <Textarea
              placeholder="Describe what you'd like to see and why it would be useful..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={submitting}
            />
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !description.trim() || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI is analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit & Analyze
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FeatureRequestBoard;
