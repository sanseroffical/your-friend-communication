import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameScoreRow {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  time_seconds: number | null;
  created_at: string;
  display_name?: string;
}

export function useGameScores(gameType: string, limit = 10) {
  const [scores, setScores] = useState<GameScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("game_scores")
      .select("id, user_id, game_type, score, time_seconds, created_at")
      .eq("game_type", gameType)
      .order("score", { ascending: false })
      .limit(limit);
    if (data) {
      const ids = Array.from(new Set(data.map((d) => d.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const nameMap = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
      setScores(data.map((d) => ({ ...d, display_name: nameMap.get(d.user_id) ?? "Player" })));
    }
    setLoading(false);
  }, [gameType, limit]);

  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (score: number, timeSeconds?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "auth" as const };
    const clamped = Math.max(0, Math.min(10_000_000, Math.floor(score)));
    const { error } = await supabase.from("game_scores").insert({
      user_id: user.id,
      game_type: gameType,
      score: clamped,
      time_seconds: timeSeconds != null ? Math.max(0, Math.min(86400, Math.floor(timeSeconds))) : null,
    });
    if (!error) {
      // Award small XP (best-effort, server caps at 500)
      try { await supabase.rpc("increment_user_xp", { p_user_id: user.id, p_xp_amount: Math.min(50, Math.floor(clamped / 100) + 5) }); } catch {}
      load();
      return { ok: true as const };
    }
    return { ok: false as const, reason: error.message };
  }, [gameType, load]);

  return { scores, loading, submit, reload: load };
}
