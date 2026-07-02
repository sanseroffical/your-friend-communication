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
    <div className="relative flex items-center justify-between px-4 py-3 glass border-b border-border/60">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-primary opacity-70" />
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-full bg-gradient-primary opacity-70 blur-sm" />
          <Avatar className="relative h-10 w-10 ring-2 ring-background">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
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
            className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span className="font-mono tracking-wider">{roomCode}</span>
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
