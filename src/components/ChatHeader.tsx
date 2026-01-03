import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserPresenceIndicator from "./UserPresenceIndicator";
import AdminBadge from "./AdminBadge";

interface PresenceUser {
  id: string;
  name: string;
  online_at: string;
}

interface ChatHeaderProps {
  roomCode: string;
  userName: string;
  avatarUrl?: string | null;
  onlineUsers?: PresenceUser[];
  isAdmin?: boolean;
  isModerator?: boolean;
}

const ChatHeader = ({ 
  roomCode, 
  userName, 
  avatarUrl,
  onlineUsers = [],
  isAdmin,
  isModerator,
}: ChatHeaderProps) => {
  const { toast } = useToast();

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard. Share it with your friend!",
    });
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">{userName}</h2>
            {isAdmin && <AdminBadge role="admin" />}
            {isModerator && !isAdmin && <AdminBadge role="moderator" />}
          </div>
          <button 
            onClick={copyRoomCode}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">{roomCode}</span>
            <Copy className="w-3 h-3" />
          </button>
        </div>
        {onlineUsers.length > 0 && (
          <div className="hidden sm:block ml-4">
            <UserPresenceIndicator onlineUsers={onlineUsers} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
