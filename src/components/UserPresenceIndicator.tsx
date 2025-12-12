import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PresenceUser {
  id: string;
  name: string;
  online_at: string;
}

interface UserPresenceIndicatorProps {
  onlineUsers: PresenceUser[];
}

const UserPresenceIndicator = ({ onlineUsers }: UserPresenceIndicatorProps) => {
  if (onlineUsers.length === 0) return null;

  const displayUsers = onlineUsers.slice(0, 5);
  const remainingCount = onlineUsers.length - 5;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name} is online</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                  <span className="text-xs text-muted-foreground">+{remainingCount}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          {onlineUsers.length} online
        </span>
      </div>
    </TooltipProvider>
  );
};

export default UserPresenceIndicator;
