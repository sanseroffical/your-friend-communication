import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Copy, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import UserPresenceIndicator from "./UserPresenceIndicator";
import AdminBadge from "./AdminBadge";
import SettingsPanel from "./SettingsPanel";
import NotificationSettings from "./NotificationSettings";
import ModerationBotPanel from "./ModerationBotPanel";
import AdminPanel from "./AdminPanel";

interface PresenceUser {
  id: string;
  name: string;
  online_at: string;
}

interface ChatHeaderProps {
  roomCode: string;
  onLeaveRoom: () => void;
  userName: string;
  avatarUrl?: string | null;
  userId: string;
  onStartCall?: (video: boolean) => void;
  onSearch?: () => void;
  onEditProfile?: () => void;
  onlineUsers?: PresenceUser[];
  isAdmin?: boolean;
  isModerator?: boolean;
}

const ChatHeader = ({ 
  roomCode, 
  onLeaveRoom, 
  userName, 
  avatarUrl,
  userId,
  onStartCall, 
  onSearch,
  onEditProfile,
  onlineUsers = [],
  isAdmin,
  isModerator,
}: ChatHeaderProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard. Share it with your friend!",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleVoiceCall = () => {
    onStartCall?.(false);
  };

  const handleVideoCall = () => {
    onStartCall?.(true);
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
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          onClick={onSearch}
          title="Search messages"
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          onClick={handleVoiceCall}
          title="Start voice call"
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          onClick={handleVideoCall}
          title="Start video call"
        >
          <Video className="h-5 w-5" />
        </Button>
        <NotificationSettings />
        <ModerationBotPanel isAdmin={isAdmin || false} roomCode={roomCode} />
        {(isAdmin || isModerator) && <AdminPanel isAdmin={isAdmin || false} isModerator={isModerator || false} />}
        <SettingsPanel userId={userId} roomCode={roomCode} isAdmin={isAdmin} />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-destructive"
          onClick={onLeaveRoom}
          title="Leave room"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-destructive ml-2"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
