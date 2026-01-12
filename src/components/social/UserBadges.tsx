import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBadges, BADGE_DEFINITIONS, UserBadge } from '@/hooks/useBadges';

interface UserBadgesProps {
  userId: string;
  compact?: boolean;
}

const UserBadges = ({ userId, compact = false }: UserBadgesProps) => {
  const { badges, loading } = useBadges(userId);

  if (loading || badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1 flex-wrap">
          {badges.slice(0, 3).map((badge) => {
            const def = BADGE_DEFINITIONS[badge.badge_type as keyof typeof BADGE_DEFINITIONS];
            if (!def) return null;

            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <span className="text-sm cursor-default">{def.icon}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{def.name}</p>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {badges.length > 3 && (
            <span className="text-xs text-muted-foreground">+{badges.length - 3}</span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Award className="h-4 w-4 text-primary" />
          Badges ({badges.length})
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const def = BADGE_DEFINITIONS[badge.badge_type as keyof typeof BADGE_DEFINITIONS];
            if (!def) return null;

            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 cursor-default">
                    <span>{def.icon}</span>
                    <span>{def.name}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{def.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned {new Date(badge.earned_at).toLocaleDateString()}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default UserBadges;
