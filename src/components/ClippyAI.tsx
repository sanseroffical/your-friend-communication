import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  X, Send, Sparkles, Loader2, Trash2, HelpCircle, 
  MessageSquare, Lightbulb, BookOpen, Smile, RefreshCw,
  ImagePlus, Users, Code, Link as LinkIcon
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  imageUrl?: string;
}

interface ClippyAIProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string | null;
  roomMessages?: Array<{ senderName: string; content: string }>;
}

const QUICK_PROMPTS = [
  { icon: HelpCircle, label: "How do I use this app?", prompt: "How do I use this chat app? What features does it have?" },
  { icon: MessageSquare, label: "Chat tips", prompt: "Give me some tips for chatting and making friends in this app." },
  { icon: Lightbulb, label: "Feature ideas", prompt: "What are some cool features I should try out?" },
  { icon: BookOpen, label: "Commands", prompt: "Are there any special commands or shortcuts I can use?" },
  { icon: Smile, label: "Tell a joke", prompt: "Tell me a funny tech or office-related joke!" },
  { icon: Code, label: "Explain code", prompt: "Can you help me understand a piece of code?" },
  { icon: LinkIcon, label: "Summarize chat", prompt: "Can you summarize what's been happening in the chat room?" },
];

const FUN_FACTS = [
  "Did you know? I was the original AI assistant, helping Office users since 1997! 📎",
  "Fun fact: I can now analyze images! Try sending me a picture! 🖼️",
  "Tip: I can see the chat room! Ask me to summarize what's happening! 💬",
  "I've been watching you type... just kidding! But I am always here to help! 📎",
  "Pro tip: Try asking me about Bonzi Buddy for some drama! 🍿",
  "New: I can generate code previews and help with links! 🔗",
];

const ClippyAI = ({ isOpen, onClose, roomCode, roomMessages }: ClippyAIProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hey! I'm Clippy, your AI assistant! I can now analyze images 🖼️, see chat rooms 💬, and more! What can I help with? 📎",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const refreshFunFact = () => {
    const currentIndex = FUN_FACTS.indexOf(funFact);
    setFunFact(FUN_FACTS[(currentIndex + 1) % FUN_FACTS.length]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if ((!text && !imagePreview) || isLoading) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text || "What's in this image?", timestamp: new Date(), imageUrl: imagePreview || undefined };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentImage = imagePreview;
    setImagePreview(null);

    try {
      let response;

      // If in a room and asking about chat, use room context
      if (roomCode && roomMessages && (text.toLowerCase().includes("chat") || text.toLowerCase().includes("summarize") || text.toLowerCase().includes("room") || text.toLowerCase().includes("conversation"))) {
        response = await supabase.functions.invoke("ai-features", {
          body: {
            action: "clippy_room_message",
            room_messages: roomMessages.slice(-20),
            user_question: text,
          },
        });
      } else if (currentImage) {
        // Image analysis
        response = await supabase.functions.invoke("ai-features", {
          body: {
            action: "clippy_with_image",
            messages: [...messages.filter(m => !m.imageUrl).map(m => ({ role: m.role, content: m.content })), { role: "user", content: text || "What do you see?" }],
            image_url: currentImage,
          },
        });
      } else {
        // Standard chat
        response = await supabase.functions.invoke("chat", {
          body: { messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: text }] },
        });
      }

      if (response.error) throw response.error;

      const data = response.data;
      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Sorry: ${data.error}`, timestamp: new Date() }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message || "I'm here to help! 📎", timestamp: new Date() }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble. Try again later! 📎", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      setActiveTab("chat");
    }
  };

  const clearHistory = () => {
    setMessages([{ role: "assistant", content: "Chat cleared! What can I help you with? 📎", timestamp: new Date() }]);
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
            {roomCode && (
              <Badge variant="secondary" className="text-[10px]">
                <Users className="h-2 w-2 mr-1" />
                In Room
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearHistory} title="Clear chat">
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
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Attached" className="w-full max-h-32 object-cover rounded mb-1" />
                        )}
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        {msg.timestamp && (
                          <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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
                <ScrollArea className="h-40">
                  {QUICK_PROMPTS.map((item, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="w-full justify-start text-xs h-auto py-2 mb-1"
                      onClick={() => sendMessage(item.prompt)}
                      disabled={isLoading}
                    >
                      <item.icon className="h-3 w-3 mr-2 shrink-0" />
                      {item.label}
                    </Button>
                  ))}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-3 pb-1">
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-12 rounded border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full"
                  onClick={() => setImagePreview(null)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            </div>
          )}

          <div className="p-3 border-t flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={roomCode ? "Ask about the chat..." : "Ask Clippy anything..."}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isLoading}
              className="text-sm"
            />
            <Button size="icon" onClick={() => sendMessage()} disabled={isLoading || (!input.trim() && !imagePreview)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClippyAI;
