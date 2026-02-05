 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 
 export interface LeaderboardEntry {
   userId: string;
   displayName: string;
   avatarUrl: string | null;
   clipId: string;
   level: number;
   xp: number;
   rank: number;
 }
 
 export function useLeaderboard(limit: number = 25) {
   const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchLeaderboard = async () => {
       try {
         // Get user levels
         const { data: levels, error: levelsError } = await supabase
           .from('user_levels')
           .select('user_id, level, xp')
           .order('level', { ascending: false })
           .order('xp', { ascending: false })
           .limit(limit);
 
         if (levelsError) throw levelsError;
         if (!levels?.length) {
           setEntries([]);
           setLoading(false);
           return;
         }
 
         // Get profiles for these users
         const userIds = levels.map(l => l.user_id);
         const { data: profiles, error: profilesError } = await supabase
           .from('profiles')
           .select('id, display_name, avatar_url, clip_id')
           .in('id', userIds);
 
         if (profilesError) throw profilesError;
 
         // Combine data
         const leaderboard = levels.map((level, index) => {
           const profile = profiles?.find(p => p.id === level.user_id);
           return {
             userId: level.user_id,
             displayName: profile?.display_name || 'Unknown',
             avatarUrl: profile?.avatar_url,
             clipId: profile?.clip_id || '',
             level: level.level,
             xp: level.xp,
             rank: index + 1,
           };
         });
 
         setEntries(leaderboard);
       } catch (error) {
         console.error('Error fetching leaderboard:', error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchLeaderboard();
 
     // Subscribe to changes
     const channel = supabase
       .channel('leaderboard_changes')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'user_levels' }, () => {
         fetchLeaderboard();
       })
       .subscribe();
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [limit]);
 
   return { entries, loading };
 }