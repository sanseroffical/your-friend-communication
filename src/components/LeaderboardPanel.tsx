 import { Trophy, Medal, Award, Crown, Star, Users } from 'lucide-react';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { useLeaderboard } from '@/hooks/useLeaderboard';
 import { cn } from '@/lib/utils';
 
 interface LeaderboardPanelProps {
   onClose?: () => void;
 }
 
 const LeaderboardPanel = ({ onClose }: LeaderboardPanelProps) => {
   const { entries, loading } = useLeaderboard(25);
 
   const getRankIcon = (rank: number) => {
     switch (rank) {
       case 1:
         return <Crown className="h-5 w-5 text-yellow-500" />;
       case 2:
         return <Medal className="h-5 w-5 text-gray-400" />;
       case 3:
         return <Award className="h-5 w-5 text-amber-600" />;
       default:
         return <span className="w-5 text-center text-sm font-medium text-muted-foreground">#{rank}</span>;
     }
   };
 
   const getRankStyles = (rank: number) => {
     switch (rank) {
       case 1:
         return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
       case 2:
         return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30';
       case 3:
         return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
       default:
         return 'bg-card border-border';
     }
   };
 
   if (loading) {
     return (
       <div className="p-6 text-center">
         <div className="animate-spin text-2xl mb-2">🏆</div>
         <p className="text-muted-foreground">Loading leaderboard...</p>
       </div>
     );
   }
 
   return (
     <div className="p-4">
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
           <Trophy className="h-5 w-5 text-primary" />
           <h2 className="text-lg font-bold">Leaderboard</h2>
         </div>
         <Badge variant="secondary" className="gap-1">
           <Users className="h-3 w-3" />
           {entries.length} Players
         </Badge>
       </div>
 
       <ScrollArea className="h-[450px]">
         <div className="space-y-2 pr-4">
           {entries.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
               <p className="font-medium">No rankings yet</p>
               <p className="text-sm">Be the first to level up!</p>
             </div>
           ) : (
             entries.map((entry) => (
               <div
                 key={entry.userId}
                 className={cn(
                   'flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01]',
                   getRankStyles(entry.rank)
                 )}
               >
                 <div className="flex items-center justify-center w-8">
                   {getRankIcon(entry.rank)}
                 </div>
 
                 <Avatar className="h-10 w-10 border-2 border-background">
                   <AvatarImage src={entry.avatarUrl || undefined} />
                   <AvatarFallback className="text-xs">
                     {entry.displayName.slice(0, 2).toUpperCase()}
                   </AvatarFallback>
                 </Avatar>
 
                 <div className="flex-1 min-w-0">
                   <p className="font-medium truncate">{entry.displayName}</p>
                   <p className="text-xs text-muted-foreground">@{entry.clipId}</p>
                 </div>
 
                 <div className="text-right">
                   <div className="flex items-center gap-1">
                     <Star className="h-4 w-4 text-primary" />
                     <span className="font-bold">Lvl {entry.level}</span>
                   </div>
                   <p className="text-xs text-muted-foreground">{entry.xp.toLocaleString()} XP</p>
                 </div>
               </div>
             ))
           )}
         </div>
       </ScrollArea>
     </div>
   );
 };
 
 export default LeaderboardPanel;