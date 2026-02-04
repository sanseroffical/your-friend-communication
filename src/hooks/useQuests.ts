import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClipUser } from './useClipUser';
import { useUserLevel } from './useUserLevel';
import { useToast } from './use-toast';

export interface Quest {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  quest_type: string;
  requirement_type: string;
  requirement_count: number;
  is_active: boolean | null;
  created_at: string;
}

export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  current_progress: number;
  completed_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  quest?: Quest;
}

export function useQuests() {
  const { authUser } = useClipUser();
  const { addXp } = useUserLevel();
  const { toast } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [progress, setProgress] = useState<QuestProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .order('quest_type');

      if (error) throw error;
      setQuests(data || []);
    } catch (error) {
      console.error('Error fetching quests:', error);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', authUser.id);

      if (error) throw error;
      setProgress(data || []);
    } catch (error) {
      console.error('Error fetching quest progress:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  useEffect(() => {
    if (authUser?.id) {
      fetchProgress();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('quest_progress_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_quest_progress',
            filter: `user_id=eq.${authUser.id}`,
          },
          () => {
            fetchProgress();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [authUser?.id, fetchProgress]);

  const updateQuestProgress = useCallback(async (requirementType: string, incrementBy: number = 1) => {
    if (!authUser?.id) return;

    // Find quests that match this requirement type
    const matchingQuests = quests.filter(q => q.requirement_type === requirementType);
    
    for (const quest of matchingQuests) {
      try {
        // Get or create progress for this quest
        let existingProgress = progress.find(p => p.quest_id === quest.id);

        if (!existingProgress) {
          // Create new progress entry
          const { data: newProgress, error: insertError } = await supabase
            .from('user_quest_progress')
            .insert({
              user_id: authUser.id,
              quest_id: quest.id,
              current_progress: incrementBy,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          existingProgress = newProgress;
        } else if (!existingProgress.completed_at) {
          // Update existing progress
          const newProgressValue = existingProgress.current_progress + incrementBy;
          
          const { error: updateError } = await supabase
            .from('user_quest_progress')
            .update({
              current_progress: newProgressValue,
              completed_at: newProgressValue >= quest.requirement_count ? new Date().toISOString() : null,
            })
            .eq('id', existingProgress.id);

          if (updateError) throw updateError;

          // Check if quest was just completed
          if (newProgressValue >= quest.requirement_count && !existingProgress.completed_at) {
            toast({
              title: '🎯 Quest Completed!',
              description: `${quest.title} - Claim your ${quest.xp_reward} XP reward!`,
            });
          }
        }
      } catch (error) {
        console.error('Error updating quest progress:', error);
      }
    }

    fetchProgress();
  }, [authUser?.id, quests, progress, toast, fetchProgress]);

  const claimReward = useCallback(async (questProgressId: string) => {
    if (!authUser?.id) return false;

    const questProgress = progress.find(p => p.id === questProgressId);
    if (!questProgress || questProgress.claimed_at) return false;

    const quest = quests.find(q => q.id === questProgress.quest_id);
    if (!quest) return false;

    try {
      // Mark as claimed
      const { error } = await supabase
        .from('user_quest_progress')
        .update({ claimed_at: new Date().toISOString() })
        .eq('id', questProgressId);

      if (error) throw error;

      // Add XP
      const result = await addXp(quest.xp_reward);
      
      toast({
        title: '✨ Reward Claimed!',
        description: `+${quest.xp_reward} XP${result?.leveledUp ? ` - Level Up! You're now level ${result.newLevel.level}!` : ''}`,
      });

      fetchProgress();
      return true;
    } catch (error) {
      console.error('Error claiming reward:', error);
      return false;
    }
  }, [authUser?.id, progress, quests, addXp, toast, fetchProgress]);

  const getQuestWithProgress = useCallback((questId: string) => {
    const quest = quests.find(q => q.id === questId);
    const questProgress = progress.find(p => p.quest_id === questId);
    
    if (!quest) return null;

    return {
      ...quest,
      progressId: questProgress?.id ?? null,
      progress: questProgress?.current_progress ?? 0,
      isCompleted: !!questProgress?.completed_at,
      isClaimed: !!questProgress?.claimed_at,
      progressPercent: Math.min(100, ((questProgress?.current_progress ?? 0) / quest.requirement_count) * 100),
    };
  }, [quests, progress]);

  const questsWithProgress = quests.map(q => getQuestWithProgress(q.id)!).filter(Boolean);

  return {
    quests,
    progress,
    loading,
    updateQuestProgress,
    claimReward,
    getQuestWithProgress,
    questsWithProgress,
    dailyQuests: questsWithProgress.filter(q => q.quest_type === 'daily'),
    weeklyQuests: questsWithProgress.filter(q => q.quest_type === 'weekly'),
    achievementQuests: questsWithProgress.filter(q => q.quest_type === 'achievement'),
  };
}
