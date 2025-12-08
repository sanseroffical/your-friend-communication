import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import JoinRoom from "@/components/JoinRoom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
  senderName: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages when joining a room
  useEffect(() => {
    if (!roomCode) return;

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
          isOwn: msg.sender_name === userName,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          senderName: msg.sender_name,
        }));
        setMessages(formattedMessages);
      }
    };

    loadMessages();

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
          const newMsg = payload.new as {
            id: string;
            content: string;
            sender_name: string;
            created_at: string;
          };
          
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            
            return [
              ...prev,
              {
                id: newMsg.id,
                text: newMsg.content,
                isOwn: newMsg.sender_name === userName,
                timestamp: new Date(newMsg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                senderName: newMsg.sender_name,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, userName]);

  const handleJoinRoom = (code: string, name: string) => {
    setRoomCode(code);
    setUserName(name);
    toast({
      title: "Joined room!",
      description: `Share code "${code}" with your friend to start chatting.`,
    });
  };

  const handleLeaveRoom = () => {
    setRoomCode(null);
    setUserName(null);
    setMessages([]);
  };

  const handleSendMessage = async (text: string) => {
    if (!roomCode || !userName) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase.from("messages").insert({
        room_code: roomCode,
        sender_name: userName,
        content: text,
      });

      if (error) {
        throw error;
      }
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

  if (!roomCode || !userName) {
    return <JoinRoom onJoinRoom={handleJoinRoom} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader roomCode={roomCode} onLeaveRoom={handleLeaveRoom} />
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
              <p className="text-sm mt-2">Share code <span className="font-mono font-bold">{roomCode}</span> with your friend.</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isOwn={message.isOwn}
              timestamp={message.timestamp}
              senderName={message.isOwn ? undefined : message.senderName}
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
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
};

export default Index;
