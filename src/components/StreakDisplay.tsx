 import { useState, useEffect } from 'react';
 import { Flame, Gift, Trophy, Zap } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import { useStreak, getStreakBonus } from '@/hooks/useStreak';
 import { cn } from '@/lib/utils';
 
 interface StreakDisplayProps {
   compact?: boolean;
   onStreakCheck?: () => void;
 }
 
 const StreakDisplay = ({ compact = false, onStreakCheck }: StreakDisplayProps) => {
   const { streak, loading, checkAndUpdateStreak, claimDailyBonus } = useStreak();
   const [claiming, setClaiming] = useState(false);
   const [checked, setChecked] = useState(false);
 
   // Check streak on mount
   useEffect(() => {
     if (!checked && !loading) {
       checkAndUpdateStreak().then(() => {
         setChecked(true);
         onStreakCheck?.();
       });
     }
   }, [checked, loading, checkAndUpdateStreak, onStreakCheck]);
 
   const handleClaim = async () => {
     setClaiming(true);
     await claimDailyBonus();
     setClaiming(false);
   };
 
   if (loading || !streak) {
     return null;
   }
 
   const bonus = getStreakBonus(streak.currentStreak);
   const canClaim = !streak.streakXpClaimedToday && streak.currentStreak > 0;
 
   // Progress to next milestone
   const milestones = [3, 7, 14, 30];
   const nextMilestone = milestones.find(m => m > streak.currentStreak) || 30;
   const prevMilestone = milestones.filter(m => m <= streak.currentStreak).pop() || 0;
   const progress = ((streak.currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
 
   if (compact) {
     return (
       <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
         <Flame className={cn(
           "h-5 w-5",
           streak.currentStreak >= 7 ? "text-orange-500" : "text-muted-foreground"
         )} />
         <div className="flex-1 min-w-0">
           <div className="flex items-center justify-between">
             <span className="font-bold text-sm">{streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}</span>
             {canClaim && (
               <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleClaim} disabled={claiming}>
                 <Gift className="h-3 w-3 mr-1" />
                 +{bonus} XP
               </Button>
             )}
           </div>
           <Progress value={progress} className="h-1 mt-1" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 via-red-500/5 to-yellow-500/10 border border-orange-500/20">
       <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-2">
           <div className={cn(
             "p-2 rounded-full",
             streak.currentStreak >= 7 ? "bg-orange-500/20" : "bg-muted"
           )}>
             <Flame className={cn(
               "h-6 w-6",
               streak.currentStreak >= 30 ? "text-red-500 animate-pulse" :
               streak.currentStreak >= 7 ? "text-orange-500" : 
               "text-muted-foreground"
             )} />
           </div>
           <div>
             <h3 className="font-bold text-lg">{streak.currentStreak} Day Streak</h3>
             <p className="text-xs text-muted-foreground">
               Best: {streak.longestStreak} days
             </p>
           </div>
         </div>
         
         {canClaim ? (
           <Button 
             onClick={handleClaim} 
             disabled={claiming}
             className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
           >
             {claiming ? (
               <span className="animate-spin">⏳</span>
             ) : (
               <>
                 <Gift className="h-4 w-4" />
                 Claim +{bonus} XP
               </>
             )}
           </Button>
         ) : streak.streakXpClaimedToday ? (
           <Badge variant="secondary" className="gap-1">
             <Zap className="h-3 w-3" />
             Claimed today
           </Badge>
         ) : null}
       </div>
 
       <div className="space-y-2">
         <div className="flex items-center justify-between text-sm">
           <span className="text-muted-foreground">Progress to {nextMilestone} days</span>
           <span className="font-medium">{streak.currentStreak}/{nextMilestone}</span>
         </div>
         <Progress value={progress} className="h-2" />
       </div>
 
       <div className="mt-4 grid grid-cols-4 gap-2">
         {[3, 7, 14, 30].map((milestone) => (
           <div 
             key={milestone}
             className={cn(
               "text-center p-2 rounded-lg border transition-all",
               streak.currentStreak >= milestone 
                 ? "bg-primary/10 border-primary/30" 
                 : "bg-muted/50 border-border opacity-50"
             )}
           >
             <Trophy className={cn(
               "h-4 w-4 mx-auto mb-1",
               streak.currentStreak >= milestone ? "text-primary" : "text-muted-foreground"
             )} />
             <p className="text-xs font-medium">{milestone}d</p>
             <p className="text-xs text-muted-foreground">+{getStreakBonus(milestone)}</p>
           </div>
         ))}
       </div>
     </div>
   );
 };
 
 export default StreakDisplay;