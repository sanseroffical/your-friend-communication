import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Star, TrendingUp, Award, Shield, Crown } from 'lucide-react';

interface ReputationScoreProps {
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  friendsCount: number;
  level: number;
  streakDays: number;
  compact?: boolean;
}

const RANKS = [
  { min: 0, max: 100, name: 'Newcomer', icon: Star, color: 'text-slate-500' },
  { min: 100, max: 500, name: 'Regular', icon: TrendingUp, color: 'text-green-500' },
  { min: 500, max: 1500, name: 'Trusted', icon: Shield, color: 'text-blue-500' },
  { min: 1500, max: 5000, name: 'Respected', icon: Award, color: 'text-purple-500' },
  { min: 5000, max: Infinity, name: 'Legend', icon: Crown, color: 'text-yellow-500' },
];

const ReputationScore = ({
  postsCount,
  likesReceived,
  commentsReceived,
  friendsCount,
  level,
  streakDays,
  compact = false,
}: ReputationScoreProps) => {
  const score = useMemo(() => {
    // Calculate reputation score based on various factors
    const postScore = postsCount * 10;
    const likeScore = likesReceived * 5;
    const commentScore = commentsReceived * 3;
    const friendScore = friendsCount * 15;
    const levelScore = level * 50;
    const streakScore = streakDays * 2;

    return postScore + likeScore + commentScore + friendScore + levelScore + streakScore;
  }, [postsCount, likesReceived, commentsReceived, friendsCount, level, streakDays]);

  const rank = useMemo(() => {
    return RANKS.find(r => score >= r.min && score < r.max) || RANKS[RANKS.length - 1];
  }, [score]);

  const progressToNextRank = useMemo(() => {
    const currentRankIndex = RANKS.indexOf(rank);
    if (currentRankIndex === RANKS.length - 1) return 100;
    
    const currentMin = rank.min;
    const nextMin = RANKS[currentRankIndex + 1].min;
    return Math.min(100, ((score - currentMin) / (nextMin - currentMin)) * 100);
  }, [score, rank]);

  const RankIcon = rank.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1 cursor-help ${rank.color}`}>
              <RankIcon className="h-3 w-3" />
              <span>{score}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{rank.name}</p>
            <p className="text-xs text-muted-foreground">{score} reputation points</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RankIcon className={`h-5 w-5 ${rank.color}`} />
          <span className="font-bold">{rank.name}</span>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Star className="h-3 w-3" />
          {score.toLocaleString()}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress to next rank</span>
          <span>{Math.round(progressToNextRank)}%</span>
        </div>
        <Progress value={progressToNextRank} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="p-2 rounded bg-muted/50">
          <p className="font-bold">{postsCount}</p>
          <p className="text-xs text-muted-foreground">Posts</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <p className="font-bold">{likesReceived}</p>
          <p className="text-xs text-muted-foreground">Likes</p>
        </div>
        <div className="p-2 rounded bg-muted/50">
          <p className="font-bold">{friendsCount}</p>
          <p className="text-xs text-muted-foreground">Friends</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>💡 Earn reputation by posting, getting likes, and making friends!</p>
      </div>
    </div>
  );
};

export default ReputationScore;
