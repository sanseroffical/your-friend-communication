import { useRef, useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PeerState {
  connection: RTCPeerConnection;
  remoteStream: MediaStream;
  gainNode: GainNode;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const PROXIMITY_RADIUS = 8; // units in 3D space
const MAX_VOLUME = 1;

export const usePlazaVoiceChat = (
  localUserId: string | null,
  localPosition: [number, number, number] | null,
  remoteUsers: { id: string; position: [number, number, number] }[]
) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Set up signaling channel
  useEffect(() => {
    if (!localUserId) return;

    const channel = supabase.channel(`plaza-voice-${localUserId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "voice-offer" }, async ({ payload }) => {
        if (payload.targetId !== localUserId) return;
        await handleOffer(payload.fromId, payload.offer);
      })
      .on("broadcast", { event: "voice-answer" }, async ({ payload }) => {
        if (payload.targetId !== localUserId) return;
        const peer = peersRef.current.get(payload.fromId);
        if (peer) {
          await peer.connection.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          );
        }
      })
      .on("broadcast", { event: "voice-ice" }, async ({ payload }) => {
        if (payload.targetId !== localUserId) return;
        const peer = peersRef.current.get(payload.fromId);
        if (peer && payload.candidate) {
          try {
            await peer.connection.addIceCandidate(
              new RTCIceCandidate(payload.candidate)
            );
          } catch (e) {
            // ignore
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [localUserId]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const createPeer = useCallback(
    (remoteId: string): PeerState => {
      const ctx = getAudioContext();
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const remoteStream = new MediaStream();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(ctx.destination);

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
        // Connect to gain node for volume control
        const source = ctx.createMediaStreamSource(remoteStream);
        source.connect(gainNode);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "voice-ice",
            payload: {
              fromId: localUserId,
              targetId: remoteId,
              candidate: event.candidate.toJSON(),
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          removePeer(remoteId);
        }
      };

      // Add local stream if available
      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach((t) => pc.addTrack(t, localStreamRef.current!));
      }

      const state: PeerState = { connection: pc, remoteStream, gainNode };
      peersRef.current.set(remoteId, state);
      setConnectedPeers(new Set(peersRef.current.keys()));
      return state;
    },
    [localUserId, getAudioContext]
  );

  const removePeer = useCallback((remoteId: string) => {
    const peer = peersRef.current.get(remoteId);
    if (peer) {
      peer.connection.close();
      peer.gainNode.disconnect();
      peersRef.current.delete(remoteId);
      setConnectedPeers(new Set(peersRef.current.keys()));
    }
  }, []);

  const handleOffer = useCallback(
    async (fromId: string, offer: RTCSessionDescriptionInit) => {
      if (!isMicOn || !channelRef.current) return;
      let peer = peersRef.current.get(fromId);
      if (!peer) peer = createPeer(fromId);

      await peer.connection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);

      channelRef.current.send({
        type: "broadcast",
        event: "voice-answer",
        payload: {
          fromId: localUserId,
          targetId: fromId,
          answer,
        },
      });
    },
    [isMicOn, localUserId, createPeer]
  );

  // Update volume based on proximity
  useEffect(() => {
    if (!localPosition) return;

    remoteUsers.forEach((remote) => {
      const peer = peersRef.current.get(remote.id);
      if (!peer) return;

      const dx = localPosition[0] - remote.position[0];
      const dz = localPosition[2] - remote.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      const volume =
        dist >= PROXIMITY_RADIUS
          ? 0
          : MAX_VOLUME * (1 - dist / PROXIMITY_RADIUS);
      peer.gainNode.gain.value = volume;
    });
  }, [localPosition, remoteUsers]);

  // Connect/disconnect peers based on proximity
  useEffect(() => {
    if (!isMicOn || !localPosition || !channelRef.current) return;

    const interval = setInterval(async () => {
      for (const remote of remoteUsers) {
        const dx = localPosition[0] - remote.position[0];
        const dz = localPosition[2] - remote.position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        const hasPeer = peersRef.current.has(remote.id);

        if (dist < PROXIMITY_RADIUS && !hasPeer) {
          // Initiate connection (only if our ID is "greater" to avoid duplicate offers)
          if (localUserId && localUserId > remote.id) {
            const peer = createPeer(remote.id);
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            channelRef.current?.send({
              type: "broadcast",
              event: "voice-offer",
              payload: {
                fromId: localUserId,
                targetId: remote.id,
                offer,
              },
            });
          }
        } else if (dist >= PROXIMITY_RADIUS + 2 && hasPeer) {
          // Disconnect if too far (with hysteresis)
          removePeer(remote.id);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isMicOn, localPosition, remoteUsers, localUserId, createPeer, removePeer]);

  const toggleMic = useCallback(async () => {
    if (isMicOn) {
      // Turn off
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      // Disconnect all peers
      peersRef.current.forEach((_, id) => removePeer(id));
      setIsMicOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        localStreamRef.current = stream;
        setIsMicOn(true);
      } catch (e) {
        console.error("Failed to get microphone:", e);
      }
    }
  }, [isMicOn, removePeer]);

  // Cleanup
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((peer) => peer.connection.close());
      audioContextRef.current?.close();
    };
  }, []);

  return { isMicOn, toggleMic, connectedPeers };
};
