import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ChatHeader from "@/components/ChatHeader";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: string;
  senderName?: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    text: "Hey! How are you doing? 😊",
    isOwn: false,
    timestamp: "10:30 AM",
    senderName: "Alex",
  },
  {
    id: "2",
    text: "I'm doing great, thanks! Just finished that project we talked about.",
    isOwn: true,
    timestamp: "10:32 AM",
  },
  {
    id: "3",
    text: "That's awesome! Can't wait to see it. Want to grab coffee later and tell me about it?",
    isOwn: false,
    timestamp: "10:33 AM",
    senderName: "Alex",
  },
  {
    id: "4",
    text: "Sounds perfect! How about 3pm at the usual spot?",
    isOwn: true,
    timestamp: "10:35 AM",
  },
  {
    id: "5",
    text: "Perfect! See you then! ☕",
    isOwn: false,
    timestamp: "10:36 AM",
    senderName: "Alex",
  },
];

const Index = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate friend's response after a short delay
    setTimeout(() => {
      const responses = [
        "That's interesting! Tell me more.",
        "Haha, I totally agree! 😄",
        "Nice! What do you think about...",
        "I was just thinking the same thing!",
        "Sounds good to me! 👍",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const friendMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse,
        isOwn: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        senderName: "Alex",
      };
      setMessages((prev) => [...prev, friendMessage]);
    }, 1000 + Math.random() * 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader friendName="Alex" isOnline />
      
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSend={handleSendMessage} />
      </div>
    </div>
  );
};

export default Index;
