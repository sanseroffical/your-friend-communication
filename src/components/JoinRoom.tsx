import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Users } from "lucide-react";

interface JoinRoomProps {
  onJoinRoom: (roomCode: string, userName: string) => void;
}

const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const JoinRoom = ({ onJoinRoom }: JoinRoomProps) => {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");

  const handleCreateRoom = () => {
    if (userName.trim()) {
      const newCode = generateRoomCode();
      onJoinRoom(newCode, userName.trim());
    }
  };

  const handleJoinRoom = () => {
    if (userName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase(), userName.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">FriendChat</h1>
          <p className="text-muted-foreground">Connect with your friend in real-time</p>
        </div>

        <div className="bg-card border border-border p-6 shadow-lg">
          {mode === "choose" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => userName.trim() && setMode("create")}
                  disabled={!userName.trim()}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Users className="w-5 h-5" />
                  <span>Create Room</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => userName.trim() && setMode("join")}
                  disabled={!userName.trim()}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Join Room</span>
                </Button>
              </div>
            </div>
          )}

          {mode === "create" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Create a new room and share the code with your friend
              </p>
              <Button onClick={handleCreateRoom} className="w-full">
                Create & Get Room Code
              </Button>
              <Button variant="ghost" onClick={() => setMode("choose")} className="w-full">
                Back
              </Button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Room Code</label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="bg-background text-center text-2xl tracking-widest font-mono"
                />
              </div>
              <Button 
                onClick={handleJoinRoom} 
                className="w-full"
                disabled={roomCode.length !== 6}
              >
                Join Room
              </Button>
              <Button variant="ghost" onClick={() => setMode("choose")} className="w-full">
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
