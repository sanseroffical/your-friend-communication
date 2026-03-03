import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Users, History, ArrowLeft, Trash2, LogOut, Copy, Check, Globe, Heart, Sparkles, Box } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import ClippyButton from "./ClippyButton";
import UpdateLog from "./UpdateLog";
import CommunityRules from "./CommunityRules";
import LegalPages from "./LegalPages";
import DirectMessagesPanel from "./DirectMessagesPanel";
import SupportArea from "./SocialArea";
import SocialHub from "./social/SocialHub";
import StatusBar from "./StatusBar";
import QuickSettings from "./QuickSettings";
import { useMobileUI } from "./MobileUIToggle";

const PUBLIC_ROOM_CODE = "C6ZC9N";

interface ChatHistoryItem {
  id: string;
  room_code: string;
  last_accessed_at: string;
}

interface MainMenuProps {
  onJoinRoom: (roomCode: string) => void;
  userName: string;
  clipId: string;
  userId: string;
}

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const MainMenu = ({ onJoinRoom, userName, clipId, userId }: MainMenuProps) => {
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"main" | "join" | "history">("main");
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobileUI } = useMobileUI();

  useEffect(() => {
    if (mode === "history") {
      loadChatHistory();
    }
  }, [mode]);

  const loadChatHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .order("last_accessed_at", { ascending: false });

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = () => {
    const newCode = generateRoomCode();
    onJoinRoom(newCode);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim().length === 6) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("chat_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setChatHistory(prev => prev.filter(item => item.id !== id));
      toast({ title: "Deleted", description: "Chat removed from history" });
    } catch (error) {
      console.error("Error deleting history:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const copyClipId = () => {
    navigator.clipboard.writeText(clipId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Your clipID has been copied" });
  };

  if (mode === "join") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("main")}
                className="w-fit -ml-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <CardTitle>Join Room</CardTitle>
              <CardDescription>Enter the 6-character room code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Room code (e.g., ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
              />
              <Button
                onClick={handleJoinRoom}
                className="w-full"
                disabled={roomCode.trim().length !== 6}
              >
                Join Room
              </Button>
            </CardContent>
          </Card>
          <ClippyButton />
        </div>
      </div>
    );
  }

  if (mode === "history") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("main")}
                className="w-fit -ml-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <CardTitle>Chat History</CardTitle>
              <CardDescription>Your recent conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No chat history yet</p>
                </div>
              ) : (
                <ScrollArea className="h-72">
                  <div className="space-y-2">
                    {chatHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onJoinRoom(item.room_code)}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-mono font-semibold">{item.room_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.last_accessed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          <ClippyButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StatusBar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className={`w-full max-w-md ${isMobileUI ? 'border-0 shadow-none' : ''}`}>
          <CardHeader className="text-center">
            <div className="flex items-center justify-between">
              <QuickSettings />
              <div className="flex-1 text-center">
                <CardTitle className="text-2xl">Welcome, {userName}!</CardTitle>
              </div>
              <div className="w-9" /> {/* Spacer for balance */}
            </div>
            <CardDescription>
              <button 
                onClick={copyClipId}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                clipID: <span className="font-mono">{clipId}</span>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsSocialOpen(true)}
              >
                <Users className="h-4 w-4" />
                Social Hub
              </Button>
              <DirectMessagesPanel userId={userId} userName={userName} />
            </div>
            <Button onClick={() => onJoinRoom(PUBLIC_ROOM_CODE)} variant="default" className="w-full" size="lg">
              <Globe className="mr-2 h-5 w-5" />
              Join Public Chat
            </Button>
            <Button onClick={() => navigate("/plaza")} variant="default" className="w-full" size="lg">
              <Box className="mr-2 h-5 w-5" />
              Enter 3D Plaza
            </Button>
            <Button onClick={handleCreateRoom} variant="outline" className="w-full" size="lg">
              <MessageSquare className="mr-2 h-5 w-5" />
              Create Private Room
            </Button>
            <Button onClick={() => setMode("join")} variant="outline" className="w-full" size="lg">
              <Users className="mr-2 h-5 w-5" />
              Join Existing Room
            </Button>
            <Button onClick={() => setMode("history")} variant="outline" className="w-full" size="lg">
              <History className="mr-2 h-5 w-5" />
              Chat History
            </Button>
            <div className="flex gap-2 justify-center pt-2">
              <UpdateLog />
              <CommunityRules />
              <SupportArea />
            </div>
            <div className="pt-2">
              <Button onClick={handleLogout} variant="ghost" className="w-full text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
            <div className="flex justify-center pt-2">
              <LegalPages />
            </div>
          </CardContent>
        </Card>
        <ClippyButton />
        <SocialHub isOpen={isSocialOpen} onOpenChange={setIsSocialOpen} />
      </div>
    </div>
  );
};

export default MainMenu;
