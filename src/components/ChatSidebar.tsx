import { Phone, Video, Search, LogOut, Settings, Bell, BellOff, BellRing, Shield, Bot, Gamepad2, MessageSquare, Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

interface ChatSidebarProps {
  roomCode: string;
  userId: string;
  userName: string;
  isAdmin: boolean;
  isModerator: boolean;
  onLeaveRoom: () => void;
  onStartCall: (video: boolean) => void;
  onSearch: () => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenModBot: () => void;
  onOpenGames: () => void;
  onOpenDMs: () => void;
  onOpenSocial: () => void;
  onOpenFriends: () => void;
}

const ChatSidebar = ({
  roomCode,
  userId,
  userName,
  isAdmin,
  isModerator,
  onLeaveRoom,
  onStartCall,
  onSearch,
  onOpenSettings,
  onOpenAdmin,
  onOpenModBot,
  onOpenGames,
  onOpenDMs,
  onOpenSocial,
  onOpenFriends,
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isSupported, permission, requestPermission } = useNotifications();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleNotificationClick = async () => {
    if (!isSupported) return;
    
    if (permission === 'granted') {
      toast({
        title: 'Notifications Enabled',
        description: 'You will receive notifications for new messages',
      });
      return;
    }

    if (permission === 'denied') {
      toast({
        title: 'Notifications Blocked',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      });
      return;
    }

    const granted = await requestPermission();
    if (granted) {
      toast({
        title: 'Notifications Enabled!',
        description: 'You will now receive notifications for new messages',
      });
    }
  };

  const NotificationIcon = permission === 'granted' 
    ? BellRing 
    : permission === 'denied' 
      ? BellOff 
      : Bell;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-2">
        <SidebarTrigger />
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Communication</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onSearch} tooltip="Search messages">
                  <Search className="h-4 w-4" />
                  {!collapsed && <span>Search</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onStartCall(false)} tooltip="Voice call">
                  <Phone className="h-4 w-4" />
                  {!collapsed && <span>Voice Call</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onStartCall(true)} tooltip="Video call">
                  <Video className="h-4 w-4" />
                  {!collapsed && <span>Video Call</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenGames} tooltip="Games">
                  <Gamepad2 className="h-4 w-4" />
                  {!collapsed && <span>Games</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenDMs} tooltip="Direct Messages">
                  <MessageSquare className="h-4 w-4" />
                  {!collapsed && <span>DMs</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenSocial} tooltip="Social Hub">
                  <Users className="h-4 w-4" />
                  {!collapsed && <span>Social</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenFriends} tooltip="Friends">
                  <UserPlus className="h-4 w-4" />
                  {!collapsed && <span>Friends</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isSupported && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleNotificationClick} tooltip="Notifications">
                    <NotificationIcon className="h-4 w-4" />
                    {!collapsed && <span>Notifications</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onOpenModBot} tooltip="Moderation Bot">
                    <Bot className="h-4 w-4" />
                    {!collapsed && <span>Mod Bot</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {(isAdmin || isModerator) && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onOpenAdmin} tooltip="Admin Panel">
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Admin</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenSettings} tooltip="Settings">
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onLeaveRoom} tooltip="Leave room" className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Leave Room</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ChatSidebar;
