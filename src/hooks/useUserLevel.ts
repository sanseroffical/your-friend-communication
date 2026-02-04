import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClipUser } from './useClipUser';

export interface UserLevel {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}

// XP required for each level (exponential growth)
export const getXpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

export const getTotalXpForLevel = (level: number): number => {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXpForLevel(i);
  }
  return total;
};

export const getLevelFromXp = (totalXp: number): { level: number; currentXp: number; xpForNext: number } => {
  let level = 1;
  let remainingXp = totalXp;
  
  while (remainingXp >= getXpForLevel(level)) {
    remainingXp -= getXpForLevel(level);
    level++;
  }
  
  return {
    level,
    currentXp: remainingXp,
    xpForNext: getXpForLevel(level),
  };
};

export function useUserLevel() {
  const { authUser } = useClipUser();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.id) {
      setLoading(false);
      return;
    }

    const fetchOrCreateLevel = async () => {
      try {
        // Try to fetch existing level
        const { data, error } = await supabase
          .from('user_levels')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // No level exists, create one
          const { data: newLevel, error: insertError } = await supabase
            .from('user_levels')
            .insert({ user_id: authUser.id, xp: 0, level: 1 })
            .select()
            .single();

          if (insertError) throw insertError;
          setUserLevel(newLevel);
        } else if (error) {
          throw error;
        } else {
          setUserLevel(data);
        }
      } catch (error) {
        console.error('Error fetching user level:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateLevel();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_level_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_levels',
          filter: `user_id=eq.${authUser.id}`,
        },
        (payload) => {
          if (payload.new) {
            setUserLevel(payload.new as UserLevel);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  const addXp = useCallback(async (amount: number) => {
    if (!authUser?.id || !userLevel) return null;

    const newTotalXp = userLevel.xp + amount;
    const { level: newLevel } = getLevelFromXp(newTotalXp);
    const leveledUp = newLevel > userLevel.level;

    const { data, error } = await supabase
      .from('user_levels')
      .update({ xp: newTotalXp, level: newLevel })
      .eq('user_id', authUser.id)
      .select()
      .single();

    if (error) {
      console.error('Error adding XP:', error);
      return null;
    }

    return { newLevel: data, leveledUp, previousLevel: userLevel.level };
  }, [authUser?.id, userLevel]);

  const levelInfo = userLevel ? getLevelFromXp(userLevel.xp) : null;

  return {
    userLevel,
    loading,
    addXp,
    level: levelInfo?.level ?? 1,
    currentXp: levelInfo?.currentXp ?? 0,
    xpForNext: levelInfo?.xpForNext ?? 100,
    progress: levelInfo ? (levelInfo.currentXp / levelInfo.xpForNext) * 100 : 0,
  };
}
