import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, Loader2, X, Rocket, CheckCircle, ChevronRight
} from "lucide-react";

interface SmartOnboardingProps {
  onNavigate?: (area: string) => void;
  onClose?: () => void;
}

interface OnboardingGuide {
  welcome_message: string;
  recommended_steps: Array<{ title: string; description: string; feature_area: string }>;
  fun_tip: string;
  estimated_time: string;
}

const SmartOnboarding = ({ onNavigate, onClose }: SmartOnboardingProps) => {
  const [guide, setGuide] = useState<OnboardingGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const INTEREST_OPTIONS = ["Chat", "Games", "Social", "Customization", "Quests", "Friends"];

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-features", {
        body: { action: "onboarding_guide", current_step: "start", user_interests: interests.join(", ") },
      });
      if (error) throw error;
      const g = typeof data?.guide === "string" ? JSON.parse(data.guide) : data?.guide;
      setGuide(g);
      setStarted(true);
    } catch (e) {
      console.error("Onboarding error:", e);
    } finally {
      setLoading(false);
    }
  };

  const completeStep = (index: number, area: string) => {
    setCompletedSteps(prev => new Set([...prev, index]));
    onNavigate?.(area);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Smart Onboarding</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!started ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              What are you most interested in? AI will create a personalized guide for you!
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <Badge
                  key={interest}
                  variant={interests.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
            <Button onClick={startOnboarding} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating your guide...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate My Guide</>
              )}
            </Button>
          </div>
        ) : guide ? (
          <div className="space-y-4">
            <p className="text-sm">{guide.welcome_message}</p>
            
            <div className="space-y-2">
              {guide.recommended_steps?.map((step, i) => (
                <Card
                  key={i}
                  className={`border cursor-pointer transition-colors ${completedSteps.has(i) ? "opacity-60" : "hover:bg-accent/50"}`}
                  onClick={() => completeStep(i, step.feature_area)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {completedSteps.has(i) ? (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {guide.fun_tip && (
              <div className="p-3 bg-primary/5 rounded-lg text-xs">
                <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                {guide.fun_tip}
              </div>
            )}

            {guide.estimated_time && (
              <p className="text-[10px] text-center text-muted-foreground">
                Estimated time: {guide.estimated_time}
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SmartOnboarding;
