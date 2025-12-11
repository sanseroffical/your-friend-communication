import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, Monitor, MonitorOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WebRTCSignaling, WebRTCConnection } from "@/utils/webrtc";

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  isVideoCall: boolean;
  userId: string;
  userName: string;
}

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  connection?: WebRTCConnection;
  connectionState: RTCPeerConnectionState;
}

const VideoCall = ({ isOpen, onClose, roomCode, isVideoCall, userId, userName }: VideoCallProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const signalingRef = useRef<WebRTCSignaling | null>(null);
  const connectionsRef = useRef<Map<string, WebRTCConnection>>(new Map());
  const { toast } = useToast();

  const createConnection = useCallback((remoteUserId: string, remoteName: string) => {
    if (!signalingRef.current || !localStream) return null;

    const connection = new WebRTCConnection(
      signalingRef.current,
      remoteUserId,
      (stream) => {
        console.log('Got remote stream from:', remoteUserId);
        setParticipants(prev => {
          const updated = new Map(prev);
          const participant = updated.get(remoteUserId);
          if (participant) {
            updated.set(remoteUserId, { ...participant, stream });
          }
          return updated;
        });
      },
      (state) => {
        console.log('Connection state for', remoteUserId, ':', state);
        setParticipants(prev => {
          const updated = new Map(prev);
          const participant = updated.get(remoteUserId);
          if (participant) {
            updated.set(remoteUserId, { ...participant, connectionState: state });
          }
          return updated;
        });
      }
    );

    connection.setLocalStream(localStream);
    connectionsRef.current.set(remoteUserId, connection);
    
    setParticipants(prev => {
      const updated = new Map(prev);
      updated.set(remoteUserId, {
        id: remoteUserId,
        name: remoteName,
        connection,
        connectionState: 'new',
      });
      return updated;
    });

    return connection;
  }, [localStream]);

  const initializeCall = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall,
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize signaling
      const signaling = new WebRTCSignaling(roomCode, userId, userName, {
        onUserJoined: async (joinedUserId, joinedUserName) => {
          console.log('User joined call:', joinedUserId, joinedUserName);
          toast({
            title: "User joined",
            description: `${joinedUserName} joined the call`,
          });
          
          // Create connection and send offer to the new user
          const connection = createConnection(joinedUserId, joinedUserName);
          if (connection) {
            try {
              const offer = await connection.createOffer();
              await signaling.sendOffer(joinedUserId, offer);
            } catch (error) {
              console.error('Error creating offer:', error);
            }
          }
        },
        onUserLeft: (leftUserId) => {
          console.log('User left call:', leftUserId);
          const connection = connectionsRef.current.get(leftUserId);
          if (connection) {
            connection.close();
            connectionsRef.current.delete(leftUserId);
          }
          setParticipants(prev => {
            const updated = new Map(prev);
            updated.delete(leftUserId);
            return updated;
          });
          toast({
            title: "User left",
            description: "A user left the call",
          });
        },
        onOffer: async (offer, fromUserId) => {
          console.log('Received offer from:', fromUserId);
          let connection = connectionsRef.current.get(fromUserId);
          if (!connection) {
            connection = createConnection(fromUserId, 'User');
          }
          if (connection) {
            try {
              const answer = await connection.handleOffer(offer);
              await signaling.sendAnswer(fromUserId, answer);
            } catch (error) {
              console.error('Error handling offer:', error);
            }
          }
        },
        onAnswer: async (answer, fromUserId) => {
          console.log('Received answer from:', fromUserId);
          const connection = connectionsRef.current.get(fromUserId);
          if (connection) {
            try {
              await connection.handleAnswer(answer);
            } catch (error) {
              console.error('Error handling answer:', error);
            }
          }
        },
        onIceCandidate: async (candidate, fromUserId) => {
          const connection = connectionsRef.current.get(fromUserId);
          if (connection) {
            await connection.addIceCandidate(candidate);
          }
        },
        onCallStarted: (initiatorId, isVideo) => {
          console.log('Call started by:', initiatorId, 'isVideo:', isVideo);
        },
        onCallEnded: (endedUserId) => {
          console.log('Call ended by:', endedUserId);
        },
      });

      await signaling.connect();
      signalingRef.current = signaling;

      // Broadcast that we started/joined the call
      await signaling.broadcastCallStarted(isVideoCall);
      
      setIsConnecting(false);
      toast({
        title: isVideoCall ? "Video call started" : "Voice call started",
        description: "Waiting for others to join...",
      });
    } catch (error) {
      console.error("Error initializing call:", error);
      toast({
        title: "Error",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive",
      });
      onClose();
    }
  }, [roomCode, userId, userName, isVideoCall, createConnection, toast, onClose]);

  useEffect(() => {
    if (isOpen && !localStream) {
      initializeCall();
    }

    return () => {
      // Cleanup on unmount or when call closes
      if (!isOpen) {
        cleanup();
      }
    };
  }, [isOpen, initializeCall, localStream]);

  const cleanup = useCallback(() => {
    // Close all peer connections
    connectionsRef.current.forEach((connection) => {
      connection.close();
    });
    connectionsRef.current.clear();
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    
    // Disconnect signaling
    if (signalingRef.current) {
      signalingRef.current.broadcastCallEnded();
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }
    
    setParticipants(new Map());
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing, restore camera
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      
      if (originalVideoTrackRef.current && localStream) {
        // Replace screen track with camera track in all connections
        connectionsRef.current.forEach((connection) => {
          connection.replaceVideoTrack(originalVideoTrackRef.current!);
        });
        
        // Update local video display
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
      
      setIsScreenSharing(false);
      toast({
        title: "Screen sharing stopped",
        description: "Switched back to camera",
      });
    } else {
      // Start screen sharing
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        
        setScreenStream(screen);
        
        // Save original video track for later
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            originalVideoTrackRef.current = videoTrack;
          }
        }
        
        const screenTrack = screen.getVideoTracks()[0];
        
        // Replace camera track with screen track in all connections
        connectionsRef.current.forEach((connection) => {
          connection.replaceVideoTrack(screenTrack);
        });
        
        // Update local video display to show screen
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screen;
        }
        
        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
        setIsScreenSharing(true);
        toast({
          title: "Screen sharing started",
          description: "Others can now see your screen",
        });
      } catch (error) {
        console.error("Error sharing screen:", error);
        toast({
          title: "Screen sharing failed",
          description: "Could not share screen. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const endCall = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    cleanup();
    onClose();
    toast({
      title: "Call ended",
      description: "You have left the call",
    });
  };

  if (!isOpen) return null;

  const participantArray = Array.from(participants.values());

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Call info bar */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <span className="font-medium">Room: {roomCode}</span>
          <span className="text-sm text-muted-foreground">
            ({participantArray.length + 1} in call)
          </span>
        </div>
        {isConnecting && (
          <span className="text-sm text-muted-foreground animate-pulse">
            Connecting...
          </span>
        )}
      </div>

      {/* Video grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className={`grid gap-4 h-full ${
          participantArray.length === 0 
            ? 'grid-cols-1' 
            : participantArray.length === 1 
              ? 'grid-cols-2' 
              : 'grid-cols-2 lg:grid-cols-3'
        }`}>
          {/* Local video */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isVideoCall ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-sm">
              You {isMuted && '(Muted)'}
            </div>
          </div>

          {/* Remote participants */}
          {participantArray.map((participant) => (
            <RemoteParticipant 
              key={participant.id} 
              participant={participant} 
              isVideoCall={isVideoCall}
            />
          ))}

          {/* Placeholder when waiting for others */}
          {participantArray.length === 0 && (
            <div className="relative aspect-video bg-muted/50 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Waiting for others to join...</p>
                <p className="text-sm mt-1">Share room code: {roomCode}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Call controls */}
      <div className="p-6 flex justify-center gap-4 border-t bg-background">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        
        {isVideoCall && (
          <>
            <Button
              variant={!isVideoEnabled ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleVideo}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              disabled={isScreenSharing}
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="lg"
              className="rounded-full h-14 w-14"
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
            </Button>
          </>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full h-14 w-14"
          onClick={endCall}
          title="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

const RemoteParticipant = ({ 
  participant, 
  isVideoCall 
}: { 
  participant: Participant; 
  isVideoCall: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
      {isVideoCall && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
              {participant.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-sm">
        {participant.name}
        {participant.connectionState === 'connecting' && ' (Connecting...)'}
      </div>
      {participant.connectionState === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          Connection failed
        </div>
      )}
    </div>
  );
};

export default VideoCall;
