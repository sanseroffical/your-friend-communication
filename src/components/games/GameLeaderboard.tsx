import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, RefreshCw } from "lucide-react";
import { useGameScores, GameScore } from "@/hooks/useGameScores";
import { formatDistanceToNow } from "date-fns";

interface GameLeaderboardProps {
  gameType: string;
  gameName: string;
  showTimeColumn?: boolean;
}

const GameLeaderboard = ({ gameType, gameName, showTimeColumn = false }: GameLeaderboardProps) => {
  const { topScores, userBestScore, isLoading, refreshScores } = useGameScores(gameType);
  const [isExpanded, setIsExpanded] = useState(false);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-muted-foreground text-sm w-4 text-center">{rank}</span>;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <Trophy className="h-4 w-4" />
        {userBestScore ? (
          <span>Your best: {userBestScore.score.toLocaleString()}</span>
        ) : (
          <span>View Leaderboard</span>
        )}
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-sm">{gameName} Leaderboard</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refreshScores}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setIsExpanded(false)}
          >
            Hide
          </Button>
        </div>
      </div>

      {userBestScore && (
        <div className="mb-3 p-2 bg-primary/10 rounded-md">
          <p className="text-xs text-muted-foreground">Your Best</p>
          <p className="font-bold text-primary">{userBestScore.score.toLocaleString()}</p>
        </div>
      )}

      <ScrollArea className="h-[200px]">
        {topScores.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scores yet!</p>
            <p className="text-xs">Be the first to set a record</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topScores.map((score, index) => (
              <div
                key={score.id}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  index < 3 ? 'bg-muted/50' : ''
                }`}
              >
                <div className="w-6 flex justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{score.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(score.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{score.score.toLocaleString()}</p>
                  {showTimeColumn && score.time_seconds && (
                    <p className="text-xs text-muted-foreground">{formatTime(score.time_seconds)}</p>
                  )}
                </div>
                {score.difficulty && (
                  <Badge variant="outline" className="text-xs">
                    {score.difficulty}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default GameLeaderboard;
