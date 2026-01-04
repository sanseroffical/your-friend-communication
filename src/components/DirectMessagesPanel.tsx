import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowLeft, Send, Search, UserPlus } from "lucide-react";
import { useDirectMessages, Conversation } from "@/hooks/useDirectMessages";
import { cn } from "@/lib/utils";

interface DirectMessagesPanelProps {
  userId: string;
  userName: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DirectMessagesPanel = ({ userId, userName, isOpen: controlledOpen, onOpenChange }: DirectMessagesPanelProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [view, setView] = useState<"list" | "chat" | "new">("list");
  const [newMessageClipId, setNewMessageClipId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    findUserByClipId,
    activePartnerId,
    setActivePartnerId,
  } = useDirectMessages(userId);

  const [activePartner, setActivePartner] = useState<Conversation | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = async (convo: Conversation) => {
    setActivePartner(convo);
    await fetchMessages(convo.partnerId);
    setView("chat");
  };

  const handleStartNewChat = async () => {
    if (!newMessageClipId.trim()) return;
    
    setSearchError("");
    const user = await findUserByClipId(newMessageClipId.trim());
    
    if (!user) {
      setSearchError("User not found with that clipID");
      return;
    }

    if (user.id === userId) {
      setSearchError("You can't message yourself");
      return;
    }

    setActivePartner({
      partnerId: user.id,
      partnerName: user.display_name || "Unknown",
      partnerClipId: user.clip_id,
      partnerAvatar: user.avatar_url,
      lastMessage: "",
      lastMessageTime: "",
      unreadCount: 0,
    });
    await fetchMessages(user.id);
    setNewMessageClipId("");
    setView("chat");
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activePartnerId) return;

    try {
      await sendMessage(activePartnerId, messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleBack = () => {
    setView("list");
    setActivePartnerId(null);
    setActivePartner(null);
    fetchConversations();
  };

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <MessageSquare className="h-4 w-4" />
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalUnread}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {view !== "list" && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {view === "list" && "Direct Messages"}
            {view === "chat" && activePartner?.partnerName}
            {view === "new" && "New Message"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 h-[calc(100vh-120px)]">
          {view === "list" && (
            <div className="space-y-4">
              <Button 
                onClick={() => setView("new")} 
                variant="outline" 
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                New Message
              </Button>

              <ScrollArea className="h-[calc(100vh-200px)]">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start a conversation using someone's clipID</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((convo) => (
                      <button
                        key={convo.partnerId}
                        onClick={() => handleSelectConversation(convo)}
                        className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left flex items-center gap-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={convo.partnerAvatar || undefined} />
                          <AvatarFallback>
                            {convo.partnerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{convo.partnerName}</p>
                            {convo.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2">
                                {convo.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {convo.lastMessage}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {view === "new" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Enter clipID</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g., ABC12345"
                    value={newMessageClipId}
                    onChange={(e) => setNewMessageClipId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
                  />
                  <Button onClick={handleStartNewChat}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {searchError && (
                  <p className="text-sm text-destructive mt-1">{searchError}</p>
                )}
              </div>
            </div>
          )}

          {view === "chat" && activePartner && (
            <div className="flex flex-col h-full">
              <div className="text-sm text-muted-foreground mb-2">
                clipID: {activePartner.partnerClipId}
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_id === userId ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2",
                          msg.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.sender_id === userId 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        )}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DirectMessagesPanel;
