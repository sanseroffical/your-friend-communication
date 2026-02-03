import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GameScore {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  time_seconds: number | null;
  difficulty: string | null;
  created_at: string;
  display_name?: string;
}

export const useGameScores = (gameType: string) => {
  const [topScores, setTopScores] = useState<GameScore[]>([]);
  const [userBestScore, setUserBestScore] = useState<GameScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTopScores = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch top 10 scores for this game with profile info
      const { data, error } = await supabase
        .from("game_scores")
        .select(`
          id,
          user_id,
          game_type,
          score,
          time_seconds,
          difficulty,
          created_at
        `)
        .eq("game_type", gameType)
        .order("score", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch display names for these users
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);
        
        const scoresWithNames = data.map(score => ({
          ...score,
          display_name: profileMap.get(score.user_id) || "Anonymous",
        }));

        setTopScores(scoresWithNames);
      } else {
        setTopScores([]);
      }
    } catch (error) {
      console.error("Error fetching top scores:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameType]);

  const fetchUserBest = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("game_scores")
        .select("*")
        .eq("game_type", gameType)
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setUserBestScore(data);
      }
    } catch (error) {
      // No previous score
    }
  }, [gameType]);

  const submitScore = useCallback(async (
    score: number,
    timeSeconds?: number,
    difficulty?: string
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Log in to save your score to the leaderboard!",
        variant: "default",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from("game_scores")
        .insert({
          user_id: user.id,
          game_type: gameType,
          score,
          time_seconds: timeSeconds || null,
          difficulty: difficulty || null,
        });

      if (error) throw error;

      // Check if this is a new personal best
      const isNewBest = !userBestScore || score > userBestScore.score;
      
      if (isNewBest) {
        toast({
          title: "🎉 New Personal Best!",
          description: `Score: ${score.toLocaleString()}`,
        });
      }

      // Refresh leaderboard
      await fetchTopScores();
      await fetchUserBest();

      return isNewBest;
    } catch (error) {
      console.error("Error submitting score:", error);
      toast({
        title: "Error",
        description: "Failed to save score",
        variant: "destructive",
      });
      return false;
    }
  }, [gameType, userBestScore, fetchTopScores, fetchUserBest, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchTopScores();
    fetchUserBest();

    const channel = supabase
      .channel(`leaderboard-${gameType}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_scores",
          filter: `game_type=eq.${gameType}`,
        },
        () => {
          fetchTopScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameType, fetchTopScores, fetchUserBest]);

  return {
    topScores,
    userBestScore,
    isLoading,
    submitScore,
    refreshScores: fetchTopScores,
  };
};
