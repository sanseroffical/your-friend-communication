import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Users, MessageSquare, Mic, MicOff, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useClipUser } from "@/hooks/useClipUser";
import { useUserRole } from "@/hooks/useUserRole";
import { useProximityVoice } from "@/hooks/useProximityVoice";
import AvatarCustomizer, { AvatarCustomization, DEFAULT_CUSTOMIZATION } from "@/components/plaza/AvatarCustomizer";
import type { PlazaUser } from "@/components/plaza/PlazaScene";

const PlazaScene = lazy(() => import("@/components/plaza/PlazaScene"));

interface ChatMsg {
  id: string;
  sender: string;
  text: string;
  time: number;
}

const Plaza = () => {
  const navigate = useNavigate();
  const { user, authUser, isLoading } = useClipUser();
  const { isAdmin, isModerator } = useUserRole(authUser?.id || null);
  const [localUser, setLocalUser] = useState<PlazaUser | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<PlazaUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { isMuted, toggleMute, activeConnections } = useProximityVoice(
    authUser?.id || null,
    localUser?.targetPosition || null,
    remoteUsers.map((u) => ({ id: u.id, position: u.targetPosition })),
    channelRef.current
  );

  // Load avatar customization from profile
  useEffect(() => {
    if (!authUser?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_customization")
        .eq("id", authUser.id)
        .single();
      if (data?.avatar_customization) {
        setCustomization(data.avatar_customization as unknown as AvatarCustomization);
      }
    };
    load();
  }, [authUser?.id]);

  // Initialize local user
  useEffect(() => {
    if (!authUser || !user) return;

    const startAngle = Math.random() * Math.PI * 2;
    const startDist = 3 + Math.random() * 3;
    const startPos: [number, number, number] = [
      Math.cos(startAngle) * startDist,
      0,
      Math.sin(startAngle) * startDist,
    ];

    setLocalUser({
      id: authUser.id,
      name: user.display_name || user.clip_id,
      avatarColor: customization.bodyColor,
      position: startPos,
      targetPosition: startPos,
      isAdmin,
      isModerator,
      customization,
    });
  }, [authUser, user, isAdmin, isModerator, customization]);

  // Set up realtime presence
  useEffect(() => {
    if (!localUser) return;

    const channel = supabase.channel("plaza-presence", {
      config: { presence: { key: localUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PlazaUser[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key === localUser.id) return;
          const p = (presences as any[])[0];
          if (p) {
            users.push({
              id: key,
              name: p.name || "User",
              avatarColor: p.customization?.bodyColor || p.avatarColor || "#999",
              position: p.position || [0, 0, 0],
              targetPosition: p.targetPosition || p.position || [0, 0, 0],
              message: p.message,
              messageTime: p.messageTime,
              isAdmin: p.isAdmin,
              isModerator: p.isModerator,
              customization: p.customization,
              isSpeaking: p.isSpeaking,
            });
          }
        });
        setRemoteUsers(users);
      })
      .on("broadcast", { event: "plaza-chat" }, ({ payload }) => {
        setChatMessages((prev) => [
          ...prev.slice(-99),
          {
            id: `${Date.now()}-${Math.random()}`,
            sender: payload.sender,
            text: payload.text,
            time: Date.now(),
          },
        ]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: localUser.name,
            avatarColor: localUser.avatarColor,
            position: localUser.position,
            targetPosition: localUser.targetPosition,
            isAdmin: localUser.isAdmin,
            isModerator: localUser.isModerator,
            customization: localUser.customization,
            isSpeaking: !isMuted,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [localUser?.id]);

  // Update presence when position/state changes
  useEffect(() => {
    if (!localUser || !channelRef.current) return;

    const timeout = setTimeout(() => {
      channelRef.current?.track({
        name: localUser.name,
        avatarColor: localUser.avatarColor,
        position: localUser.position,
        targetPosition: localUser.targetPosition,
        message: localUser.message,
        messageTime: localUser.messageTime,
        isAdmin: localUser.isAdmin,
        isModerator: localUser.isModerator,
        customization: localUser.customization,
        isSpeaking: !isMuted,
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [localUser?.targetPosition, localUser?.message, isMuted]);

  const handleMove = useCallback((position: [number, number, number]) => {
    setLocalUser((prev) => (prev ? { ...prev, targetPosition: position } : prev));
  }, []);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim() || !localUser || !channelRef.current) return;

    const text = chatInput.trim();
    channelRef.current.send({
      type: "broadcast",
      event: "plaza-chat",
      payload: { sender: localUser.name, text },
    });

    setChatMessages((prev) => [
      ...prev.slice(-99),
      { id: `${Date.now()}`, sender: localUser.name, text, time: Date.now() },
    ]);

    setLocalUser((prev) =>
      prev ? { ...prev, message: text, messageTime: Date.now() } : prev
    );

    setChatInput("");
  }, [chatInput, localUser]);

  const handleUserClick = useCallback((userId: string) => {
    // Could open a profile card
  }, []);

  const handleCustomizationSave = useCallback((newCustom: AvatarCustomization) => {
    setCustomization(newCustom);
    setLocalUser((prev) =>
      prev ? { ...prev, customization: newCustom, avatarColor: newCustom.bodyColor } : prev
    );
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !localUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Loading Plaza...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Loading 3D world...</p>
          </div>
        }
      >
        <PlazaScene
          localUser={localUser}
          remoteUsers={remoteUsers}
          onMove={handleMove}
          onUserClick={handleUserClick}
        />
      </Suspense>

      {/* Top bar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
        <Button variant="secondary" size="sm" onClick={() => navigate("/")} className="shadow-lg">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Badge variant="secondary" className="shadow-lg">
          <Users className="h-3 w-3 mr-1" />
          {remoteUsers.length + 1} online
        </Badge>
        {activeConnections.length > 0 && (
          <Badge variant="default" className="shadow-lg">
            🎤 {activeConnections.length} in voice
          </Badge>
        )}
      </div>

      {/* Right controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCustomizerOpen(true)}
          className="shadow-lg"
        >
          <Palette className="h-4 w-4" />
        </Button>
        <Button
          variant={isMuted ? "secondary" : "default"}
          size="sm"
          onClick={toggleMute}
          className="shadow-lg"
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setChatOpen(!chatOpen)}
          className="shadow-lg"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10">
        <Badge variant="secondary" className="shadow-lg text-xs">
          Click to move • Nearby users auto-connect voice • Customize your avatar
        </Badge>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="absolute right-4 bottom-4 w-80 bg-card/90 backdrop-blur-sm border rounded-lg shadow-xl z-10 flex flex-col" style={{ maxHeight: "50vh" }}>
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Plaza Chat</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatOpen(false)}>✕</Button>
          </div>
          <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(50vh - 80px)" }}>
            <div className="space-y-1">
              {chatMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hello! 👋</p>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <span className="font-semibold text-primary">{msg.sender}: </span>
                  <span className="text-foreground">{msg.text}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t flex gap-1">
            <Input
              placeholder="Say something..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              className="h-8 text-xs"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSendChat}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Avatar Customizer */}
      <AvatarCustomizer
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        userId={authUser?.id || ""}
        currentCustomization={customization}
        onSave={handleCustomizationSave}
      />
    </div>
  );
};

export default Plaza;
