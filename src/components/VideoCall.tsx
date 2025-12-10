import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  isVideoCall: boolean;
}

const VideoCall = ({ isOpen, onClose, roomCode, isVideoCall }: VideoCallProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startCall();
    }
    return () => {
      stopCall();
    };
  }, [isOpen]);

  const startCall = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
      toast({
        title: isVideoCall ? "Video call started" : "Voice call started",
        description: `Room: ${roomCode}`,
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Error",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
      onClose();
    }
  };

  const stopCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    stopCall();
    onClose();
    toast({
      title: "Call ended",
      description: "You have left the call",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        {isVideoCall ? (
          <div className="relative w-full max-w-4xl aspect-video bg-muted rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <VideoOff className="h-12 w-12 text-muted-foreground" />
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 text-sm text-white bg-black/50 px-2 py-1 rounded">
              Room: {roomCode}
            </div>
          </div>
        ) : (
          <Card className="w-full max-w-md p-8 text-center">
            <div className="w-32 h-32 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Mic className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Voice Call</h2>
            <p className="text-muted-foreground">Room: {roomCode}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {isMuted ? "Muted" : "Speaking..."}
            </p>
          </Card>
        )}
      </div>

      <div className="p-6 flex justify-center gap-4">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        
        {isVideoCall && (
          <Button
            variant={!isVideoEnabled ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={endCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;
