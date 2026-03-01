import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  ai_analysis: string | null;
  ai_priority: string | null;
  upvotes: number;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
  voted?: boolean;
}

export function useFeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("feature_requests")
      .select("*")
      .order("upvotes", { ascending: false }) as any;

    if (error) { console.error(error); return; }

    // Fetch profiles and votes
    const userIds = [...new Set((data || []).map((r: any) => r.user_id))] as string[];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
    const { data: votes } = await supabase.from("feature_votes").select("feature_id").eq("user_id", user.id) as any;

    const votedIds = new Set((votes || []).map((v: any) => v.feature_id));
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setRequests((data || []).map((r: any) => ({
      ...r,
      profile: profileMap.get(r.user_id),
      voted: votedIds.has(r.id),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const submitRequest = useCallback(async (title: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get AI analysis
    let aiAnalysis = null;
    let aiPriority = null;
    try {
      const { data } = await supabase.functions.invoke("ai-features", {
        body: { action: "analyze_feature_request", title, description },
      });
      if (data?.analysis) {
        aiAnalysis = JSON.stringify(data.analysis);
        aiPriority = data.analysis.priority;
      }
    } catch (e) { /* AI analysis is optional */ }

    const { error } = await supabase.from("feature_requests").insert({
      user_id: user.id, title, description, ai_analysis: aiAnalysis, ai_priority: aiPriority,
      category: aiAnalysis ? JSON.parse(aiAnalysis).category : "general",
    } as any);

    if (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } else {
      toast({ title: "Submitted!", description: "Your feature request has been analyzed by AI" });
      fetchRequests();
    }
  }, [fetchRequests, toast]);

  const toggleVote = useCallback(async (featureId: string, currentlyVoted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (currentlyVoted) {
      await (supabase.from("feature_votes") as any).delete().eq("feature_id", featureId).eq("user_id", user.id);
      await (supabase.from("feature_requests") as any).update({ upvotes: requests.find(r => r.id === featureId)!.upvotes - 1 }).eq("id", featureId);
    } else {
      await (supabase.from("feature_votes") as any).insert({ feature_id: featureId, user_id: user.id });
      await (supabase.from("feature_requests") as any).update({ upvotes: requests.find(r => r.id === featureId)!.upvotes + 1 }).eq("id", featureId);
    }
    fetchRequests();
  }, [requests, fetchRequests]);

  return { requests, loading, submitRequest, toggleVote, refreshRequests: fetchRequests };
}
