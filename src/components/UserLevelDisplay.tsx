import { Star, Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useUserLevel } from '@/hooks/useUserLevel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UserLevelDisplayProps {
  compact?: boolean;
  className?: string;
  showXpBar?: boolean;
}

const UserLevelDisplay = ({ compact = false, className, showXpBar = true }: UserLevelDisplayProps) => {
  const { level, currentXp, xpForNext, progress, loading } = useUserLevel();

  if (loading) {
    return null;
  }

  const getLevelColor = (lvl: number) => {
    if (lvl >= 50) return 'text-yellow-500';
    if (lvl >= 30) return 'text-purple-500';
    if (lvl >= 20) return 'text-blue-500';
    if (lvl >= 10) return 'text-green-500';
    return 'text-muted-foreground';
  };

  const getLevelBadge = (lvl: number) => {
    if (lvl >= 50) return '👑';
    if (lvl >= 30) return '💎';
    if (lvl >= 20) return '🌟';
    if (lvl >= 10) return '⭐';
    return '✨';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 cursor-default", className)}>
              <span className="text-sm">{getLevelBadge(level)}</span>
              <span className={cn("text-sm font-bold", getLevelColor(level))}>
                Lv.{level}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">Level {level}</p>
              <p className="text-xs text-muted-foreground">
                {currentXp} / {xpForNext} XP
              </p>
              <Progress value={progress} className="h-1 mt-1 w-24" />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("p-4 rounded-lg bg-card border", className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getLevelBadge(level)}</span>
          <div>
            <h3 className={cn("font-bold text-lg", getLevelColor(level))}>
              Level {level}
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {currentXp} / {xpForNext} XP
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">{Math.round(progress)}%</span>
        </div>
      </div>
      
      {showXpBar && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};

export default UserLevelDisplay;
