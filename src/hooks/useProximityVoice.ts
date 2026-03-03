import { useState, useRef, useCallback, useEffect } from "react";

interface PeerConnection {
  pc: RTCPeerConnection;
  audioElement: HTMLAudioElement;
  userId: string;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const PROXIMITY_RADIUS = 8; // Units in 3D space
const FALLOFF_START = 4; // Start fading at this distance

export const useProximityVoice = (
  localUserId: string | null,
  localPosition: [number, number, number] | null,
  remoteUsers: Array<{ id: string; position: [number, number, number] }>,
  channel: any // Supabase channel
) => {
  const [isMuted, setIsMuted] = useState(true);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Calculate distance between two positions
  const getDistance = useCallback((a: [number, number, number], b: [number, number, number]) => {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2);
  }, []);

  // Get volume based on distance
  const getVolume = useCallback((distance: number) => {
    if (distance > PROXIMITY_RADIUS) return 0;
    if (distance < FALLOFF_START) return 1;
    return 1 - (distance - FALLOFF_START) / (PROXIMITY_RADIUS - FALLOFF_START);
  }, []);

  // Update audio volumes based on proximity
  useEffect(() => {
    if (!localPosition) return;

    peersRef.current.forEach((peer) => {
      const remoteUser = remoteUsers.find((u) => u.id === peer.userId);
      if (remoteUser) {
        const dist = getDistance(localPosition, remoteUser.position);
        const vol = getVolume(dist);
        peer.audioElement.volume = vol;
      }
    });
  }, [localPosition, remoteUsers, getDistance, getVolume]);

  const createPeerConnection = useCallback(
    async (remoteUserId: string, isInitiator: boolean) => {
      if (!channel || !localStreamRef.current) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const audioEl = new Audio();
      audioEl.autoplay = true;

      // Add local tracks
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: "broadcast",
            event: "voice-ice",
            payload: {
              from: localUserId,
              to: remoteUserId,
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setActiveConnections((prev) =>
            prev.includes(remoteUserId) ? prev : [...prev, remoteUserId]
          );
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setActiveConnections((prev) => prev.filter((id) => id !== remoteUserId));
        }
      };

      peersRef.current.set(remoteUserId, { pc, audioElement: audioEl, userId: remoteUserId });

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: "broadcast",
          event: "voice-offer",
          payload: { from: localUserId, to: remoteUserId, offer },
        });
      }

      // Process any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(remoteUserId);
      if (pending) {
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.delete(remoteUserId);
      }
    },
    [channel, localUserId]
  );

  // Listen for WebRTC signaling
  useEffect(() => {
    if (!channel || !localUserId) return;

    const handleOffer = async ({ payload }: any) => {
      if (payload.to !== localUserId) return;
      if (!localStreamRef.current) return;

      await createPeerConnection(payload.from, false);
      const peer = peersRef.current.get(payload.from);
      if (!peer) return;

      await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);

      channel.send({
        type: "broadcast",
        event: "voice-answer",
        payload: { from: localUserId, to: payload.from, answer },
      });
    };

    const handleAnswer = async ({ payload }: any) => {
      if (payload.to !== localUserId) return;
      const peer = peersRef.current.get(payload.from);
      if (!peer) return;
      await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    };

    const handleIce = async ({ payload }: any) => {
      if (payload.to !== localUserId) return;
      const peer = peersRef.current.get(payload.from);
      if (peer && peer.pc.remoteDescription) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else {
        // Queue candidate
        const pending = pendingCandidatesRef.current.get(payload.from) || [];
        pending.push(payload.candidate);
        pendingCandidatesRef.current.set(payload.from, pending);
      }
    };

    channel.on("broadcast", { event: "voice-offer" }, handleOffer);
    channel.on("broadcast", { event: "voice-answer" }, handleAnswer);
    channel.on("broadcast", { event: "voice-ice" }, handleIce);

    return () => {
      // Channel cleanup is handled by parent
    };
  }, [channel, localUserId, createPeerConnection]);

  // Connect to nearby users when unmuted
  useEffect(() => {
    if (isMuted || !localPosition || !localStreamRef.current) return;

    remoteUsers.forEach((remote) => {
      const dist = getDistance(localPosition, remote.position);
      const hasPeer = peersRef.current.has(remote.id);

      if (dist <= PROXIMITY_RADIUS && !hasPeer) {
        // Only initiator if our ID is "less" to avoid double connections
        if (localUserId && localUserId < remote.id) {
          createPeerConnection(remote.id, true);
        }
      } else if (dist > PROXIMITY_RADIUS + 2 && hasPeer) {
        // Disconnect far away users
        const peer = peersRef.current.get(remote.id);
        if (peer) {
          peer.pc.close();
          peer.audioElement.srcObject = null;
          peersRef.current.delete(remote.id);
          setActiveConnections((prev) => prev.filter((id) => id !== remote.id));
        }
      }
    });
  }, [remoteUsers, localPosition, isMuted, localUserId, getDistance, createPeerConnection]);

  const toggleMute = useCallback(async () => {
    if (isMuted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setIsMuted(false);

        // Broadcast that we're now voice-active
        channel?.send({
          type: "broadcast",
          event: "voice-join",
          payload: { userId: localUserId },
        });
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    } else {
      // Stop all tracks
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;

      // Close all peer connections
      peersRef.current.forEach((peer) => {
        peer.pc.close();
        peer.audioElement.srcObject = null;
      });
      peersRef.current.clear();
      setActiveConnections([]);
      setIsMuted(true);

      channel?.send({
        type: "broadcast",
        event: "voice-leave",
        payload: { userId: localUserId },
      });
    }
  }, [isMuted, channel, localUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((peer) => {
        peer.pc.close();
        peer.audioElement.srcObject = null;
      });
      peersRef.current.clear();
    };
  }, []);

  return { isMuted, toggleMute, activeConnections };
};
