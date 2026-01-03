import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ClippyAIProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClippyAI = ({ isOpen, onClose }: ClippyAIProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey! I'm Clippy, here to help you navigate this chat. Got questions about features or need tips? Just ask! 📎" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("chat", {
        body: { messages: [...messages, { role: "user", content: userMessage }] }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I encountered an error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message || "I'm here to help! 📎" }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting right now. Please try again later! 📎" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="w-80 sm:w-96 shadow-lg border-2">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Clippy AI</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-72 p-4">
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
                    {msg.content}
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
          <div className="p-3 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Clippy anything..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isLoading}
            />
            <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClippyAI;
