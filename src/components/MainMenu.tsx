import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Users, History, ArrowLeft, Trash2, LogOut, Copy, Check, Globe, Heart, Sparkles, Box, Gamepad2 } from "lucide-react";
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
import GamepadSettings from "./GamepadSettings";

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
      <div className="min-h-screen bg-hero flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass-card">
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
              <CardTitle className="text-gradient-primary">Join Room</CardTitle>
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
                className="w-full bg-gradient-primary hover:opacity-90 shadow-glow"
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
      <div className="min-h-screen bg-hero flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md glass-card">
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
              <CardTitle className="text-gradient-primary">Chat History</CardTitle>
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
                        className="group flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-accent hover:border-primary/30 hover:shadow-md cursor-pointer transition-all"
                      >
                        <div>
                          <p className="font-mono font-semibold tracking-wider">{item.room_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.last_accessed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
    <div className="min-h-screen bg-hero flex flex-col">
      <StatusBar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className={`w-full max-w-lg glass-card ${isMobileUI ? 'border-0 shadow-none bg-transparent backdrop-blur-none' : ''}`}>
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between">
              <QuickSettings />
              <div className="flex-1" />
              <div className="w-9" />
            </div>
            <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-gradient-primary shadow-glow flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold text-gradient-primary">
              Welcome, {userName}!
            </CardTitle>
            <CardDescription>
              <button
                onClick={copyClipId}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs hover:bg-muted hover:text-foreground transition-colors mt-2"
              >
                clipID: <span className="font-mono font-semibold">{clipId}</span>
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Social row */}
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 flex-1"
                onClick={() => setIsSocialOpen(true)}
              >
                <Users className="h-4 w-4" />
                Social Hub
              </Button>
              <DirectMessagesPanel userId={userId} userName={userName} />
            </div>

            {/* Hero CTA */}
            <Button
              onClick={() => onJoinRoom(PUBLIC_ROOM_CODE)}
              className="w-full bg-gradient-primary hover:opacity-90 shadow-glow h-12 text-base font-semibold"
              size="lg"
            >
              <Globe className="mr-2 h-5 w-5" />
              Join Public Chat
            </Button>

            {/* 3D experiences grid */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => navigate("/plaza")} variant="secondary" className="h-11 justify-start">
                <Box className="mr-2 h-4 w-4" />
                3D Plaza
              </Button>
              <Button onClick={() => navigate("/games")} variant="secondary" className="h-11 justify-start">
                <Box className="mr-2 h-4 w-4" />
                Arcade
              </Button>
              <Button onClick={handleCreateRoom} variant="outline" className="h-11 justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Create Room
              </Button>
              <Button onClick={() => setMode("join")} variant="outline" className="h-11 justify-start">
                <Users className="mr-2 h-4 w-4" />
                Join Room
              </Button>
              <Button onClick={() => setMode("history")} variant="outline" className="h-11 justify-start">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              <Button onClick={() => navigate("/benchmark")} variant="outline" className="h-11 justify-start">
                <Box className="mr-2 h-4 w-4" />
                Benchmark
              </Button>
              <GamepadSettings
                trigger={
                  <Button variant="outline" className="h-11 justify-start">
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Controller
                  </Button>
                }
              />
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <UpdateLog />
              <CommunityRules />
              <SupportArea />
            </div>
            <div className="pt-1">
              <Button onClick={handleLogout} variant="ghost" size="sm" className="w-full text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
            <div className="flex justify-center">
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
