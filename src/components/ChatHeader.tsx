import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Video, Copy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ChatHeaderProps {
  roomCode: string;
  onLeaveRoom: () => void;
}

const ChatHeader = ({ roomCode, onLeaveRoom }: ChatHeaderProps) => {
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
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              💬
            </AvatarFallback>
          </Avatar>
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Chat Room</h2>
          <button 
            onClick={copyRoomCode}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">{roomCode}</span>
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Video className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-destructive"
          onClick={onLeaveRoom}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
