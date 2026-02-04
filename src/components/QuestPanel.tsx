import { useState } from 'react';
import { Target, Gift, Clock, Trophy, Star, ChevronRight, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuests } from '@/hooks/useQuests';
import { cn } from '@/lib/utils';

interface QuestPanelProps {
  onClose?: () => void;
}

const QuestPanel = ({ onClose }: QuestPanelProps) => {
  const { dailyQuests, weeklyQuests, achievementQuests, claimReward, loading } = useQuests();
  const [claiming, setClaiming] = useState<string | null>(null);

  const handleClaim = async (progressId: string) => {
    setClaiming(progressId);
    await claimReward(progressId);
    setClaiming(null);
  };

  const QuestCard = ({ quest }: { quest: ReturnType<typeof useQuests>['questsWithProgress'][0] }) => {
    const progressEntry = quest;

    return (
      <div className={cn(
        "p-4 rounded-lg border bg-card transition-all",
        progressEntry.isClaimed && "opacity-60",
        progressEntry.isCompleted && !progressEntry.isClaimed && "ring-2 ring-primary"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {progressEntry.isClaimed ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : progressEntry.isCompleted ? (
                <Gift className="h-4 w-4 text-primary animate-pulse" />
              ) : (
                <Target className="h-4 w-4 text-muted-foreground" />
              )}
              <h4 className={cn(
                "font-medium truncate",
                progressEntry.isClaimed && "line-through"
              )}>
                {quest.title}
              </h4>
            </div>
            {quest.description && (
              <p className="text-sm text-muted-foreground mb-2">{quest.description}</p>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Progress value={progressEntry.progressPercent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {progressEntry.progress} / {quest.requirement_count}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                +{quest.xp_reward} XP
              </Badge>
              <Badge variant="outline" className="capitalize">
                {quest.quest_type}
              </Badge>
            </div>
          </div>
          
          {progressEntry.isCompleted && !progressEntry.isClaimed && progressEntry.progressId && (
            <Button
              size="sm"
              onClick={() => handleClaim(progressEntry.progressId!)}
              disabled={claiming === progressEntry.progressId}
              className="shrink-0"
            >
              {claiming === progressEntry.progressId ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-1" />
                  Claim
                </>
              )}
            </Button>
          )}
          
          {progressEntry.isClaimed && (
            <Badge variant="outline" className="text-green-500 border-green-500">
              <Check className="h-3 w-3 mr-1" />
              Claimed
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const QuestList = ({ quests, emptyMessage }: { quests: typeof dailyQuests; emptyMessage: string }) => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-4">
        {quests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          quests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))
        )}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin text-2xl mb-2">🎯</div>
        <p className="text-muted-foreground">Loading quests...</p>
      </div>
    );
  }

  const completedCount = [...dailyQuests, ...weeklyQuests, ...achievementQuests].filter(q => q.isClaimed).length;
  const totalCount = dailyQuests.length + weeklyQuests.length + achievementQuests.length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Quests</h2>
        </div>
        <Badge variant="secondary">
          {completedCount} / {totalCount} Complete
        </Badge>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="daily" className="gap-1">
            <Clock className="h-3 w-3" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-1">
            <Clock className="h-3 w-3" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1">
            <Trophy className="h-3 w-3" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <QuestList 
            quests={dailyQuests} 
            emptyMessage="No daily quests available" 
          />
        </TabsContent>

        <TabsContent value="weekly">
          <QuestList 
            quests={weeklyQuests} 
            emptyMessage="No weekly quests available" 
          />
        </TabsContent>

        <TabsContent value="achievements">
          <QuestList 
            quests={achievementQuests} 
            emptyMessage="No achievements available" 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestPanel;
