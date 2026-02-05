import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import ChatSidebar from "@/components/ChatSidebar";
import MainMenu from "@/components/MainMenu";
import ClippyButton from "@/components/ClippyButton";
import VideoCall from "@/components/VideoCall";
import TypingIndicator from "@/components/TypingIndicator";
import MessageSearch from "@/components/MessageSearch";
import ProfileEditor from "@/components/ProfileEditor";
import SettingsPanel from "@/components/SettingsPanel";
import AdminPanel from "@/components/AdminPanel";
import ModerationBotPanel from "@/components/ModerationBotPanel";
import BonziBuddy from "@/components/BonziBuddy";
import GamePanel from "@/components/GamePanel";
import DirectMessagesPanel from "@/components/DirectMessagesPanel";
import SocialHub from "@/components/social/SocialHub";
import MobileSidebarButton from "@/components/MobileSidebarButton";
import FriendsPanel from "@/components/FriendsPanel";
import QuestPanel from "@/components/QuestPanel";
 import LeaderboardPanel from "@/components/LeaderboardPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClipUser } from "@/hooks/useClipUser";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { useUserPresence } from "@/hooks/useUserPresence";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAdminActions } from "@/hooks/useAdminActions";
import { useChatCommands } from "@/hooks/useChatCommands";
import { useQuests } from "@/hooks/useQuests";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
  senderName: string;
  senderId?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  editedAt?: string | null;
  parentId?: string | null;
}

interface ReplyTo {
  id: string;
  senderName: string;
  content: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isModBotOpen, setIsModBotOpen] = useState(false);
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [isDMsOpen, setIsDMsOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(false);
   const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, authUser, isLoading: userLoading, logout } = useClipUser();
  const navigate = useNavigate();

  const userId = authUser?.id || "";
  const userName = user?.display_name || user?.clip_id || "";

  const { typingUsers, setTyping } = useTypingIndicator(roomCode, userId, userName);
  const { reactions, fetchReactions, toggleReaction, AVAILABLE_EMOJIS } = useMessageReactions(roomCode, userId);
  const { onlineUsers } = useUserPresence(roomCode || "", userId, userName);
  const { fetchReadReceipts, markAsRead, getReadBy } = useReadReceipts(roomCode || "", userId);
  const { isAdmin, isModerator } = useUserRole(userId);
  const { settings, subscribeToRoomTheme } = useUserSettings(userId);
  const { deleteUserMessage } = useAdminActions(isAdmin, isModerator);
  const { processCommand } = useChatCommands(isAdmin, isModerator, roomCode || "", userId, userName);
  const { updateQuestProgress } = useQuests();

  // Subscribe to room theme when in a room
  useEffect(() => {
    if (roomCode) {
      return subscribeToRoomTheme(roomCode);
    }
  }, [roomCode, subscribeToRoomTheme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary/10");
      setTimeout(() => element.classList.remove("bg-primary/10"), 2000);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/auth");
    }
  }, [user, userLoading, navigate]);

  // Save room to chat history when joining
  const saveToHistory = async (code: string) => {
    if (!authUser?.id) return;
    
    try {
      await supabase
        .from("chat_history")
        .upsert({
          user_id: authUser.id,
          room_code: code,
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,room_code",
        });
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  // Load existing messages when joining a room
  useEffect(() => {
    if (!roomCode || !user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room_code", roomCode)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data) {
        const formattedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          text: msg.content,
          isOwn: msg.user_id === authUser?.id,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          senderName: msg.sender_name,
          senderId: msg.user_id,
          attachmentUrl: msg.attachment_url,
          attachmentType: msg.attachment_type,
          attachmentName: msg.attachment_name,
          editedAt: msg.edited_at,
          parentId: msg.parent_id,
        }));
        setMessages(formattedMessages);
        
        // Fetch reactions and read receipts for all messages
        const messageIds = data.map(m => m.id);
        fetchReactions(messageIds);
        fetchReadReceipts(messageIds);
      }
    };

    loadMessages();
    saveToHistory(roomCode);

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            
            return [
              ...prev,
              {
                id: newMsg.id,
                text: newMsg.content,
                isOwn: newMsg.user_id === authUser?.id,
                timestamp: new Date(newMsg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                senderName: newMsg.sender_name,
                senderId: newMsg.user_id,
                attachmentUrl: newMsg.attachment_url,
                attachmentType: newMsg.attachment_type,
                attachmentName: newMsg.attachment_name,
                editedAt: newMsg.edited_at,
                parentId: newMsg.parent_id,
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMsg.id
                ? { ...m, text: updatedMsg.content, editedAt: updatedMsg.edited_at }
                : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, user, authUser, fetchReactions, fetchReadReceipts]);

  const refreshProfile = useCallback(() => {
    // This is a simple approach - in production you'd refetch the user profile
    window.location.reload();
  }, []);

  const handleJoinRoom = (code: string) => {
    setRoomCode(code);
    toast({
      title: "Joined room!",
      description: `Share code "${code}" with your friend to start chatting.`,
    });
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    setMessages([]);
    setReplyTo(null);
  };

  const handleStartCall = (video: boolean) => {
    setIsVideoCall(video);
    setIsCallOpen(true);
  };

  const handleSendMessage = async (
    text: string,
    attachment?: { url: string; type: string; name: string },
    replyToId?: string
  ) => {
    if (!roomCode || !user) return;
    if (!text && !attachment) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.from("messages").insert({
        room_code: roomCode,
        sender_name: user.display_name || user.clip_id,
        content: text || "",
        user_id: authUser?.id,
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
        attachment_name: attachment?.name || null,
        parent_id: replyToId || null,
      });

      if (error) throw error;
      
      // Track message sent for quests
      updateQuestProgress('messages_sent', 1);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: newContent, edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("user_id", authUser?.id);

      if (error) throw error;
      toast({ title: "Message edited" });
    } catch (error) {
      console.error("Error editing message:", error);
      toast({
        title: "Error",
        description: "Failed to edit message.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (messageId: string, isModAction = false) => {
    try {
      if (isModAction) {
        await deleteUserMessage(messageId);
      } else {
        const { error } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId)
          .eq("user_id", authUser?.id);

        if (error) throw error;
        toast({ title: "Message deleted" });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      senderName: message.senderName,
      content: message.text,
    });
  };

  const getParentMessage = (parentId: string | null | undefined) => {
    if (!parentId) return null;
    const parent = messages.find((m) => m.id === parentId);
    if (!parent) return null;
    return { senderName: parent.senderName, content: parent.text };
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!roomCode) {
    return (
      <MainMenu
        onJoinRoom={handleJoinRoom}
        userName={user.display_name ?? user.clip_id}
        clipId={user.clip_id}
        userId={authUser?.id || ""}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <ChatSidebar
          roomCode={roomCode}
          userId={authUser?.id || ""}
          userName={userName}
          isAdmin={isAdmin}
          isModerator={isModerator}
          onLeaveRoom={handleLeaveRoom}
          onStartCall={handleStartCall}
          onSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenModBot={() => setIsModBotOpen(true)}
          onOpenGames={() => setIsGamesOpen(true)}
          onOpenDMs={() => setIsDMsOpen(true)}
          onOpenSocial={() => setIsSocialOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onOpenQuests={() => setIsQuestsOpen(true)}
           onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <ChatHeader
            roomCode={roomCode}
            userName={user.display_name || user.clip_id}
            avatarUrl={(user as any).avatar_url}
            onlineUsers={onlineUsers}
            isAdmin={isAdmin}
            isModerator={isModerator}
          />

          <div className="flex-1 overflow-y-auto px-4 py-6 relative">
            {isSearchOpen && (
              <MessageSearch
                roomCode={roomCode}
                onSelectMessage={scrollToMessage}
                onClose={() => setIsSearchOpen(false)}
              />
            )}

            <div className="max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                  <p className="text-sm mt-2">
                    Share code <span className="font-mono font-bold">{roomCode}</span> with your friend.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  id={message.id}
                  message={message.text}
                  isOwn={message.isOwn}
                  timestamp={message.timestamp}
                  senderName={message.isOwn ? undefined : message.senderName}
                  senderId={message.isOwn ? undefined : message.senderId || undefined}
                  attachmentUrl={message.attachmentUrl}
                  attachmentType={message.attachmentType}
                  attachmentName={message.attachmentName}
                  editedAt={message.editedAt}
                  parentMessage={getParentMessage(message.parentId)}
                  reactions={reactions[message.id] || []}
                  readBy={getReadBy(message.id)}
                  onReply={() => handleReply(message)}
                  onEdit={(newContent) => handleEditMessage(message.id, newContent)}
                  onDelete={() => handleDeleteMessage(message.id)}
                  onReact={(emoji) => toggleReaction(message.id, emoji)}
                  onVisible={() => markAsRead(message.id)}
                  availableEmojis={AVAILABLE_EMOJIS}
                  commandPromptMode={settings.command_prompt_mode}
                />
              ))}
              {isLoading && (
                <div className="flex justify-end mb-4">
                  <div className="bg-primary/50 text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="max-w-3xl mx-auto w-full">
            <TypingIndicator typingUsers={typingUsers} />
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onTyping={setTyping}
              onProcessCommand={processCommand}
            />
          </div>
        </div>

        <MobileSidebarButton />
        <ClippyButton />

        <VideoCall
          isOpen={isCallOpen}
          onClose={() => setIsCallOpen(false)}
          roomCode={roomCode}
          isVideoCall={isVideoCall}
          userId={authUser?.id || ""}
          userName={user.display_name || user.clip_id}
        />

        {user && (
          <ProfileEditor
            isOpen={isProfileEditorOpen}
            onClose={() => setIsProfileEditorOpen(false)}
            profile={{
              id: user.id,
              display_name: user.display_name,
              clip_id: user.clip_id,
              avatar_url: (user as any).avatar_url,
              bio: (user as any).bio,
            }}
            onProfileUpdated={refreshProfile}
          />
        )}

        {/* Settings Sheet - controlled */}
        <SettingsPanel 
          userId={authUser?.id || ""} 
          roomCode={roomCode} 
          isAdmin={isAdmin}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />

        {/* Admin Panel - controlled */}
        <AdminPanel 
          isAdmin={isAdmin} 
          isModerator={isModerator}
          isOpen={isAdminOpen}
          onOpenChange={setIsAdminOpen}
        />

        {/* Moderation Bot Panel - controlled */}
        <ModerationBotPanel 
          isAdmin={isAdmin} 
          roomCode={roomCode}
          isOpen={isModBotOpen}
          onOpenChange={setIsModBotOpen}
        />

        {/* Game Panel */}
        <GamePanel 
          roomCode={roomCode} 
          userId={authUser?.id || ""} 
          userName={userName}
          isOpen={isGamesOpen}
          onOpenChange={setIsGamesOpen}
        />

        {/* Direct Messages Panel */}
        <DirectMessagesPanel 
          userId={authUser?.id || ""} 
          userName={userName}
          isOpen={isDMsOpen}
          onOpenChange={setIsDMsOpen}
        />

        {/* Friends Panel */}
        <FriendsPanel
          userId={authUser?.id || ""}
          isOpen={isFriendsOpen}
          onOpenChange={setIsFriendsOpen}
        />

        {/* Social Hub */}
        <SocialHub
          isOpen={isSocialOpen}
          onOpenChange={setIsSocialOpen}
        />

        {/* Quest Panel */}
        <Sheet open={isQuestsOpen} onOpenChange={setIsQuestsOpen}>
          <SheetContent side="right" className="w-[400px] sm:w-[500px]">
            <SheetHeader>
              <SheetTitle>Quests & Levels</SheetTitle>
            </SheetHeader>
            <QuestPanel onClose={() => setIsQuestsOpen(false)} />
          </SheetContent>
        </Sheet>

         {/* Leaderboard Panel */}
         <Sheet open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
           <SheetContent side="right" className="w-[400px] sm:w-[500px]">
             <SheetHeader>
               <SheetTitle>Top Players</SheetTitle>
             </SheetHeader>
             <LeaderboardPanel onClose={() => setIsLeaderboardOpen(false)} />
           </SheetContent>
         </Sheet>

        {/* BonziBuddy */}
        <BonziBuddy
          enabled={settings.bonzi_enabled}
          chaosLevel={settings.bonzi_chaos_level}
          userName={userName}
        />
      </div>
    </SidebarProvider>
  );
};

export default Index;