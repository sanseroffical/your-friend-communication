import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, Send, Sparkles, Loader2, Trash2, HelpCircle, 
  MessageSquare, Lightbulb, BookOpen, Smile, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ClippyAIProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { icon: HelpCircle, label: "How do I use this app?", prompt: "How do I use this chat app? What features does it have?" },
  { icon: MessageSquare, label: "Chat tips", prompt: "Give me some tips for chatting and making friends in this app." },
  { icon: Lightbulb, label: "Feature ideas", prompt: "What are some cool features I should try out?" },
  { icon: BookOpen, label: "Commands", prompt: "Are there any special commands or shortcuts I can use?" },
  { icon: Smile, label: "Tell a joke", prompt: "Tell me a funny tech or office-related joke!" },
];

const FUN_FACTS = [
  "Did you know? I was the original AI assistant, helping Office users since 1997! 📎",
  "Fun fact: I can do more than just help - I'm also great at friendly banter! 😄",
  "Tip: You can ask me anything about this app or just chat for fun!",
  "I've been watching you type... just kidding! But I am always here to help! 📎",
  "Pro tip: Try asking me about Bonzi Buddy for some drama! 🍿",
];

const ClippyAI = ({ isOpen, onClose }: ClippyAIProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hey! I'm Clippy, here to help you navigate this chat. Got questions about features or need tips? Just ask! 📎",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const refreshFunFact = () => {
    const currentIndex = FUN_FACTS.indexOf(funFact);
    const nextIndex = (currentIndex + 1) % FUN_FACTS.length;
    setFunFact(FUN_FACTS[nextIndex]);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("chat", {
        body: { messages: [...messages, { role: "user", content: text }] }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.error) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Sorry, I encountered an error: ${data.error}`,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message || "I'm here to help! 📎",
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting right now. Please try again later! 📎",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setActiveTab("chat");
    }
  };

  const clearHistory = () => {
    setMessages([{ 
      role: "assistant", 
      content: "Chat cleared! What can I help you with? 📎",
      timestamp: new Date()
    }]);
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="w-80 sm:w-96 shadow-lg border-2">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">Clippy AI</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={clearHistory}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="chat" className="flex-1 text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="quick" className="flex-1 text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                Quick Help
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="m-0">
              <ScrollArea className="h-64 p-4" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p>{msg.content}</p>
                        {msg.timestamp && (
                          <p className={`text-[10px] mt-1 ${
                            msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="quick" className="m-0 p-3">
              <div className="space-y-2">
                <div className="p-3 bg-muted/50 rounded-lg mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{funFact}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={refreshFunFact}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {QUICK_PROMPTS.map((item, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-xs h-auto py-2"
                    onClick={() => sendMessage(item.prompt)}
                    disabled={isLoading}
                  >
                    <item.icon className="h-3 w-3 mr-2 shrink-0" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Clippy anything..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isLoading}
              className="text-sm"
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClippyAI;
