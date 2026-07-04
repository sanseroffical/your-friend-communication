import { supabase } from "@/integrations/supabase/client";

interface SignalingCallbacks {
  onOffer: (offer: RTCSessionDescriptionInit, fromUserId: string) => void;
  onAnswer: (answer: RTCSessionDescriptionInit, fromUserId: string) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit, fromUserId: string) => void;
  onUserJoined: (userId: string, userName: string) => void;
  onUserLeft: (userId: string) => void;
  onCallStarted: (initiatorId: string, isVideo: boolean) => void;
  onCallEnded: (userId: string) => void;
}

export class WebRTCSignaling {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private roomCode: string;
  private userId: string;
  private userName: string;
  private callbacks: SignalingCallbacks;

  constructor(
    roomCode: string,
    userId: string,
    userName: string,
    callbacks: SignalingCallbacks
  ) {
    this.roomCode = roomCode;
    this.userId = userId;
    this.userName = userName;
    this.callbacks = callbacks;
  }

  async connect() {
    const channelName = `call-${this.roomCode}`;
    
    this.channel = supabase.channel(channelName, {
      config: {
        presence: { key: this.userId },
      },
    });

    // Handle presence events
    this.channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Presence sync');
        // Get all existing users when syncing
        const state = this.channel?.presenceState() || {};
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== this.userId && presences.length > 0) {
            const presence = presences[0] as { userName?: string };
            this.callbacks.onUserJoined(key, presence?.userName || 'Unknown');
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined call:', key, newPresences);
        const presence = newPresences[0] as { userName?: string };
        if (key !== this.userId) {
          this.callbacks.onUserJoined(key, presence?.userName || 'Unknown');
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left call:', key);
        if (key !== this.userId) {
          this.callbacks.onUserLeft(key);
        }
      });

    // Handle broadcast events for WebRTC signaling
    this.channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.targetUserId === this.userId) {
          console.log('Received offer from:', payload.fromUserId);
          this.callbacks.onOffer(payload.offer, payload.fromUserId);
        }
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.targetUserId === this.userId) {
          console.log('Received answer from:', payload.fromUserId);
          this.callbacks.onAnswer(payload.answer, payload.fromUserId);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.targetUserId === this.userId) {
          console.log('Received ICE candidate from:', payload.fromUserId);
          this.callbacks.onIceCandidate(payload.candidate, payload.fromUserId);
        }
      })
      .on('broadcast', { event: 'call-started' }, ({ payload }) => {
        console.log('Call started by:', payload.initiatorId);
        this.callbacks.onCallStarted(payload.initiatorId, payload.isVideo);
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        console.log('Call ended by:', payload.userId);
        this.callbacks.onCallEnded(payload.userId);
      });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel?.track({
          userId: this.userId,
          userName: this.userName,
          online_at: new Date().toISOString(),
        });
      }
    });

    return this.channel;
  }

  async sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit) {
    await this.channel?.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        fromUserId: this.userId,
        targetUserId,
        offer,
      },
    });
  }

  async sendAnswer(targetUserId: string, answer: RTCSessionDescriptionInit) {
    await this.channel?.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        fromUserId: this.userId,
        targetUserId,
        answer,
      },
    });
  }

  async sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit) {
    await this.channel?.send({
      type: 'broadcast',
      event: 'ice-candidate',
      payload: {
        fromUserId: this.userId,
        targetUserId,
        candidate,
      },
    });
  }

  async broadcastCallStarted(isVideo: boolean) {
    await this.channel?.send({
      type: 'broadcast',
      event: 'call-started',
      payload: {
        initiatorId: this.userId,
        isVideo,
      },
    });
  }

  async broadcastCallEnded() {
    await this.channel?.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {
        userId: this.userId,
      },
    });
  }

  getPresenceState() {
    return this.channel?.presenceState() || {};
  }

  async disconnect() {
    if (this.channel) {
      await this.channel.untrack();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream;
  private signaling: WebRTCSignaling;
  private remoteUserId: string;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private isSettingRemoteDescription = false;

  private static readonly ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Free public TURN — required so peers behind symmetric NAT can connect.
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ];

  private restartTimer: number | null = null;
  private onConnectionStateChange: (state: RTCPeerConnectionState) => void;

  constructor(
    signaling: WebRTCSignaling,
    remoteUserId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void
  ) {
    this.signaling = signaling;
    this.remoteUserId = remoteUserId;
    this.remoteStream = new MediaStream();
    this.onConnectionStateChange = onConnectionStateChange;

    this.peerConnection = new RTCPeerConnection({
      iceServers: WebRTCConnection.ICE_SERVERS,
      iceCandidatePoolSize: 4,
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(remoteUserId, event.candidate.toJSON());
      }
    };

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      onRemoteStream(this.remoteStream);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('[webrtc] connection state:', state);
      onConnectionStateChange(state);
      if (state === 'failed') {
        // Try one ICE restart before giving up.
        this.tryIceRestart();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const s = this.peerConnection.iceConnectionState;
      console.log('[webrtc] ice state:', s);
      if (s === 'disconnected') {
        // Wait a moment; often recovers on its own.
        if (this.restartTimer) window.clearTimeout(this.restartTimer);
        this.restartTimer = window.setTimeout(() => {
          if (this.peerConnection.iceConnectionState === 'disconnected') {
            this.tryIceRestart();
          }
        }, 4000);
      } else if (s === 'connected' || s === 'completed') {
        if (this.restartTimer) { window.clearTimeout(this.restartTimer); this.restartTimer = null; }
      }
    };
  }

  private async tryIceRestart() {
    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      await this.signaling.sendOffer(this.remoteUserId, offer);
      console.log('[webrtc] ICE restart offer sent');
    } catch (e) {
      console.warn('[webrtc] ICE restart failed', e);
    }
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      console.log('Adding local track:', track.kind);
      this.peerConnection.addTrack(track, stream);
    });
  }

  replaceVideoTrack(newTrack: MediaStreamTrack) {
    const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.isSettingRemoteDescription = true;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    this.isSettingRemoteDescription = false;
    
    // Process queued ICE candidates
    await this.processIceCandidateQueue();
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    this.isSettingRemoteDescription = true;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this.isSettingRemoteDescription = false;
    
    // Process queued ICE candidates
    await this.processIceCandidateQueue();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.isSettingRemoteDescription || !this.peerConnection.remoteDescription) {
      // Queue the candidate if we're still setting up the connection
      this.iceCandidateQueue.push(candidate);
    } else {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  private async processIceCandidateQueue() {
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding queued ICE candidate:', error);
        }
      }
    }
  }

  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.peerConnection.close();
  }
}
