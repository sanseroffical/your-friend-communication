 import { useState, useEffect, useCallback, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useClipUser } from './useClipUser';
 import { useUserLevel } from './useUserLevel';
 import { useToast } from './use-toast';
 import { useQuests } from './useQuests';
 
 export interface StreakData {
   currentStreak: number;
   longestStreak: number;
   lastActiveDate: string | null;
   streakXpClaimedToday: boolean;
 }
 
 // XP bonus based on streak length
 export const getStreakBonus = (streak: number): number => {
   if (streak >= 30) return 100;
   if (streak >= 14) return 50;
   if (streak >= 7) return 25;
   if (streak >= 3) return 15;
   if (streak >= 1) return 10;
   return 0;
 };
 
 export const getStreakMilestone = (streak: number): string | null => {
   if (streak === 30) return '🔥 30 Day Streak!';
   if (streak === 14) return '⚡ 2 Week Streak!';
   if (streak === 7) return '🌟 1 Week Streak!';
   if (streak === 3) return '✨ 3 Day Streak!';
   return null;
 };
 
 export function useStreak() {
   const { authUser } = useClipUser();
   const { addXp } = useUserLevel();
   const { toast } = useToast();
   const { updateQuestProgress } = useQuests();
   const questUpdateRef = useRef(updateQuestProgress);
   const [streak, setStreak] = useState<StreakData | null>(null);
   const [loading, setLoading] = useState(true);
 
   const fetchStreak = useCallback(async () => {
     if (!authUser?.id) return;
 
     try {
       const { data, error } = await supabase
         .from('user_streaks')
         .select('*')
         .eq('user_id', authUser.id)
         .maybeSingle();
 
       if (error) throw error;
 
       if (data) {
         setStreak({
           currentStreak: data.current_streak,
           longestStreak: data.longest_streak,
           lastActiveDate: data.last_active_date,
           streakXpClaimedToday: data.streak_xp_claimed_today,
         });
       } else {
         setStreak({
           currentStreak: 0,
           longestStreak: 0,
           lastActiveDate: null,
           streakXpClaimedToday: false,
         });
       }
     } catch (error) {
       console.error('Error fetching streak:', error);
     } finally {
       setLoading(false);
     }
   }, [authUser?.id]);
 
   useEffect(() => {
     fetchStreak();
   }, [fetchStreak]);
 
   const checkAndUpdateStreak = useCallback(async () => {
     if (!authUser?.id) return null;
 
     const today = new Date().toISOString().split('T')[0];
     
     try {
       // Get current streak data
       const { data: existing, error: fetchError } = await supabase
         .from('user_streaks')
         .select('*')
         .eq('user_id', authUser.id)
         .maybeSingle();
 
       if (fetchError) throw fetchError;
 
       const yesterday = new Date();
       yesterday.setDate(yesterday.getDate() - 1);
       const yesterdayStr = yesterday.toISOString().split('T')[0];
 
       let newStreak = 1;
       let longestStreak = 1;
       let streakBroken = false;
       let isNewDay = true;
 
       if (existing) {
         const lastActive = existing.last_active_date;
         
         if (lastActive === today) {
           // Already logged in today
           isNewDay = false;
           return { isNewDay: false, streak: existing.current_streak };
         } else if (lastActive === yesterdayStr) {
           // Continuing streak
           newStreak = existing.current_streak + 1;
         } else if (lastActive) {
           // Streak broken
           streakBroken = existing.current_streak > 0;
           newStreak = 1;
         }
         
         longestStreak = Math.max(existing.longest_streak, newStreak);
 
         // Update existing record
         const { error: updateError } = await supabase
           .from('user_streaks')
           .update({
             current_streak: newStreak,
             longest_streak: longestStreak,
             last_active_date: today,
             streak_xp_claimed_today: false,
             updated_at: new Date().toISOString(),
           })
           .eq('user_id', authUser.id);
 
         if (updateError) throw updateError;
       } else {
         // Create new streak record
         const { error: insertError } = await supabase
           .from('user_streaks')
           .insert({
             user_id: authUser.id,
             current_streak: 1,
             longest_streak: 1,
             last_active_date: today,
             streak_xp_claimed_today: false,
           });
 
         if (insertError) throw insertError;
       }
 
       await fetchStreak();

       // Track daily login quest progress (only if it's a new day)
       if (isNewDay) {
         questUpdateRef.current('daily_login', 1);
       }

       return { isNewDay, streak: newStreak, streakBroken, longestStreak };
     } catch (error) {
       console.error('Error updating streak:', error);
       return null;
     }
   }, [authUser?.id, fetchStreak]);
 
   const claimDailyBonus = useCallback(async () => {
     if (!authUser?.id || !streak || streak.streakXpClaimedToday) return false;
 
     const bonus = getStreakBonus(streak.currentStreak);
     if (bonus === 0) return false;
 
     try {
       // Mark as claimed
       const { error } = await supabase
         .from('user_streaks')
         .update({ streak_xp_claimed_today: true })
         .eq('user_id', authUser.id);
 
       if (error) throw error;
 
       // Add XP
       const result = await addXp(bonus);
 
       const milestone = getStreakMilestone(streak.currentStreak);
       
       toast({
         title: milestone || `🔥 ${streak.currentStreak} Day Streak!`,
         description: `+${bonus} XP bonus claimed!${result?.leveledUp ? ` Level up to ${result.newLevel.level}!` : ''}`,
       });
 
       await fetchStreak();
       return true;
     } catch (error) {
       console.error('Error claiming daily bonus:', error);
       return false;
     }
   }, [authUser?.id, streak, addXp, toast, fetchStreak]);
 
   return {
     streak,
     loading,
     checkAndUpdateStreak,
     claimDailyBonus,
     getStreakBonus,
   };
 }