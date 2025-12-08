import { useState, useRef, useEffect } from "react";
// Chat with AI-powered responses
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
}

interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Hey! How are you doing? 😊",
    isOwn: false,
    timestamp: "Just now",
    senderName: "Alex",
  },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryMessage[]>([
    { role: "assistant", content: "Hey! How are you doing? 😊" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    
    const updatedHistory: ChatHistoryMessage[] = [
      ...chatHistory,
      { role: "user", content: text }
    ];
    setChatHistory(updatedHistory);
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { messages: updatedHistory },
      });

      if (error) {
        throw error;
      }

      const aiResponse = data?.message || "Sorry, I didn't catch that. Can you say it again?";
      
      const friendMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isOwn: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        senderName: "Alex",
      };
      
      setMessages((prev) => [...prev, friendMessage]);
      setChatHistory((prev) => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Oops!",
        description: "Alex is having trouble responding. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader friendName="Alex" isOnline={!isLoading} />
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isOwn={message.isOwn}
              timestamp={message.timestamp}
              senderName={message.senderName}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-card text-card-foreground rounded-2xl rounded-bl-sm border border-border px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
