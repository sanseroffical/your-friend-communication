import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";

interface JoinRoomProps {
  onJoinRoom: (roomCode: string) => void;
  userName: string;
}

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const JoinRoom = ({ onJoinRoom, userName }: JoinRoomProps) => {
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"choose" | "join">("choose");

  const handleCreateRoom = () => {
    const newCode = generateRoomCode();
    onJoinRoom(newCode);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome, {userName}!</CardTitle>
            <CardDescription>Create a new chat room or join an existing one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCreateRoom}
              className="w-full"
              size="lg"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Create New Room
            </Button>
            <Button
              onClick={() => setMode("join")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Existing Room
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("choose")}
            className="w-fit -ml-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <CardTitle>Join Room</CardTitle>
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
            className="w-full"
            disabled={roomCode.trim().length !== 6}
          >
            Join Room
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinRoom;