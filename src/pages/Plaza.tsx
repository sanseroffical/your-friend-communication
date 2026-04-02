import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Send, Users, MessageSquare, Mic, MicOff, Palette, Smile, Hammer, X, Reply, Edit2, Trash2, Pin, Search, CloudRain, CloudSnow, Cloud, Sun, Zap, AtSign, Lock, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack, Swords } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useClipUser } from "@/hooks/useClipUser";
import { useUserRole } from "@/hooks/useUserRole";
import { useProximityVoice } from "@/hooks/useProximityVoice";
import { useFriendships } from "@/hooks/useFriendships";
import { useUserLevel } from "@/hooks/useUserLevel";
import AvatarCustomizer, { AvatarCustomization, DEFAULT_CUSTOMIZATION } from "@/components/plaza/AvatarCustomizer";
import { checkCollision, getNearbyInteractable, EMOTE_MAP, fetchWeather } from "@/components/plaza/PlazaScene";
import type { PlazaUser, InteractableId, UserHouse, WeatherType } from "@/components/plaza/PlazaScene";
import { PLACEABLE_OBJECTS, OBJECT_COLORS } from "@/components/plaza/HouseInterior";
import type { PlacedObject, InteriorMessage } from "@/components/plaza/HouseInterior";
import { PvPArenaDialog, PvPChallengeDialog, PvPWaitingDialog, PvPCombatDialog, processTurn, statsFromLevel } from "@/components/plaza/PvPArena";
import type { PvPMatch, PvPPlayer } from "@/components/plaza/PvPArena";
import { toast } from "sonner";

const PlazaScene = lazy(() => import("@/components/plaza/PlazaScene"));
const HouseInterior = lazy(() => import("@/components/plaza/HouseInterior"));

interface ChatMsg {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  time: number;
  reactions?: Record<string, string[]>; // emoji -> userIds
  replyTo?: { sender: string; text: string };
  isPinned?: boolean;
  isWhisper?: boolean;
  whisperTo?: string;
  edited?: boolean;
}

interface WeatherState {
  type: WeatherType;
  intensity: number;
  temperature: number;
  windSpeed: number;
}

const EMOTES = Object.entries(EMOTE_MAP).map(([id, emoji]) => ({ id, emoji }));

const WEATHER_ICONS: Record<WeatherType, typeof Sun> = {
  clear: Sun, rain: CloudRain, snow: CloudSnow, cloudy: Cloud, storm: Zap,
};

const HOUSE_COLORS = ["#e8d5b7", "#b0c4de", "#deb887", "#d4c4a8", "#c8b4a0", "#a8c4b8", "#c4a8b8", "#b8c4a8"];

// Generate house positions in a neighborhood grid
const generateHousePosition = (index: number): { x: number; z: number } => {
  const cols = 4;
  const spacing = 12;
  const startX = -45;
  const startZ = -35;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: startX + col * spacing, z: startZ - row * spacing };
};

// ============ PLAZA MUSIC SYSTEM ============
interface PlazaTrack {
  id: string;
  title: string;
  emoji: string;
  url: string;
}

const PLAZA_TRACKS: PlazaTrack[] = [
  { id: "mii-theme", title: "Plaza Theme (Mii Channel)", emoji: "🎵", url: "/audio/plaza-theme.wav" },
  { id: "chill", title: "Chill Vibes", emoji: "🎵", url: "" },
  { id: "rock", title: "Rock Anthem", emoji: "🎸", url: "" },
  { id: "jazz", title: "Jazz Lounge", emoji: "🎹", url: "" },
  { id: "lofi", title: "Lo-fi Beats", emoji: "🎶", url: "" },
  { id: "classical", title: "Classical", emoji: "🎻", url: "" },
];

const usePlazaMusic = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<PlazaTrack>(PLAZA_TRACKS[0]);
  const [volume, setVolume] = useState(0.3);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    // Autoplay the plaza theme on first user interaction
    const startMusic = () => {
      if (audioRef.current && currentTrack.url) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.play().catch(() => {});
      }
      document.removeEventListener("click", startMusic);
      document.removeEventListener("keydown", startMusic);
    };
    document.addEventListener("click", startMusic);
    document.addEventListener("keydown", startMusic);

    return () => {
      audio.pause();
      audio.src = "";
      document.removeEventListener("click", startMusic);
      document.removeEventListener("keydown", startMusic);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMusicMuted ? 0 : volume;
    }
  }, [volume, isMusicMuted]);

  const playTrack = useCallback((track: PlazaTrack) => {
    if (!track.url) {
      toast.info(`"${track.title}" — coming soon!`);
      return;
    }
    setCurrentTrack(track);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (!currentTrack.url) { toast.info("No playable track selected"); return; }
    if (audioRef.current.paused) {
      if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        audioRef.current.src = currentTrack.url;
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [currentTrack]);

  const nextTrack = useCallback(() => {
    const playable = PLAZA_TRACKS.filter(t => t.url);
    if (playable.length === 0) return;
    const idx = playable.findIndex(t => t.id === currentTrack.id);
    playTrack(playable[(idx + 1) % playable.length]);
  }, [currentTrack, playTrack]);

  const prevTrack = useCallback(() => {
    const playable = PLAZA_TRACKS.filter(t => t.url);
    if (playable.length === 0) return;
    const idx = playable.findIndex(t => t.id === currentTrack.id);
    playTrack(playable[(idx - 1 + playable.length) % playable.length]);
  }, [currentTrack, playTrack]);

  return { isPlaying, currentTrack, volume, setVolume, isMusicMuted, setIsMusicMuted, playTrack, togglePlay, nextTrack, prevTrack };
};

const Plaza = () => {
  const navigate = useNavigate();
  const { user, authUser, isLoading } = useClipUser();
  const { isAdmin, isModerator } = useUserRole(authUser?.id || null);
  const { friends } = useFriendships(authUser?.id || null);
  const [localUser, setLocalUser] = useState<PlazaUser | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<PlazaUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [emotePickerOpen, setEmotePickerOpen] = useState(false);
  const [customization, setCustomization] = useState<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Interactive dialogs
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [bulletinOpen, setBulletinOpen] = useState(false);
  const [gameDialogOpen, setGameDialogOpen] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; content: string; created_at: string }>>([]);

  // Weather
  const [weather, setWeather] = useState<WeatherState>({ type: "clear", intensity: 0, temperature: 20, windSpeed: 0 });

  // User houses
  const [userHouses, setUserHouses] = useState<UserHouse[]>([]);
  const [myHouse, setMyHouse] = useState<UserHouse | null>(null);

  // House interior
  const [insideHouse, setInsideHouse] = useState<string | null>(null);
  const [insideHouseData, setInsideHouseData] = useState<{ name: string; color: string; ownerId: string } | null>(null);
  const [houseMessages, setHouseMessages] = useState<InteriorMessage[]>([]);
  const [houseChatInput, setHouseChatInput] = useState("");
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [objectMakerOpen, setObjectMakerOpen] = useState(false);
  const [placingMode, setPlacingMode] = useState<{ type: string; color: string } | null>(null);
  const [selectedObjectType, setSelectedObjectType] = useState(PLACEABLE_OBJECTS[0].type);
  const [selectedObjectColor, setSelectedObjectColor] = useState(OBJECT_COLORS[0]);
  const houseChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Chat features
  const [replyingTo, setReplyingTo] = useState<ChatMsg | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMsg | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMsg[]>([]);
  const [whisperTarget, setWhisperTarget] = useState<string | null>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { isMuted, toggleMute, activeConnections } = useProximityVoice(
    authUser?.id || null,
    localUser?.targetPosition || null,
    remoteUsers.map((u) => ({ id: u.id, position: u.targetPosition })),
    channelRef.current
  );

  const plazaMusic = usePlazaMusic();

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // Load weather
  useEffect(() => {
    const loadWeather = async () => {
      const w = await fetchWeather();
      setWeather(w);
    };
    loadWeather();
    const interval = setInterval(loadWeather, 10 * 60 * 1000); // refresh every 10 min
    return () => clearInterval(interval);
  }, []);

  // Load avatar
  useEffect(() => {
    if (!authUser?.id) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("avatar_customization").eq("id", authUser.id).single();
      if (data?.avatar_customization) setCustomization(data.avatar_customization as unknown as AvatarCustomization);
    };
    load();
  }, [authUser?.id]);

  // Load announcements
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("announcements").select("id, content, created_at").eq("is_active", true).order("created_at", { ascending: false }).limit(10);
      if (data) setAnnouncements(data);
    };
    load();
  }, []);

  // Load user houses & ensure own house exists
  useEffect(() => {
    if (!authUser?.id || !user) return;
    const loadHouses = async () => {
      const { data: houses } = await supabase.from("plaza_houses").select("*");
      if (!houses) return;

      // Get profiles for owner names
      const ownerIds = houses.map(h => h.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, clip_id").in("id", ownerIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.id] = p.display_name || p.clip_id; });

      const mapped: UserHouse[] = houses.map((h, i) => ({
        id: h.id,
        user_id: h.user_id,
        house_name: h.house_name,
        house_color: h.house_color,
        house_style: h.house_style,
        position_x: h.position_x || generateHousePosition(i).x,
        position_z: h.position_z || generateHousePosition(i).z,
        owner_name: nameMap[h.user_id] || "User",
      }));

      setUserHouses(mapped);
      const mine = mapped.find(h => h.user_id === authUser.id);
      if (mine) {
        setMyHouse(mine);
      } else {
        // Create house for this user
        const pos = generateHousePosition(mapped.length);
        const color = HOUSE_COLORS[mapped.length % HOUSE_COLORS.length];
        const { data: newHouse, error } = await supabase.from("plaza_houses").insert({
          user_id: authUser.id,
          house_name: `${user.display_name || user.clip_id}'s House`,
          house_color: color,
          position_x: pos.x,
          position_z: pos.z,
        }).select().single();
        if (newHouse && !error) {
          const h: UserHouse = {
            ...newHouse,
            owner_name: user.display_name || user.clip_id,
          };
          setMyHouse(h);
          setUserHouses(prev => [...prev, h]);
        }
      }
    };
    loadHouses();
  }, [authUser?.id, user]);

  // Initialize local user
  useEffect(() => {
    if (!authUser || !user) return;
    const startAngle = Math.random() * Math.PI * 2;
    const startDist = 3 + Math.random() * 3;
    const startPos: [number, number, number] = [Math.cos(startAngle) * startDist, 0, Math.sin(startAngle) * startDist];
    setLocalUser({
      id: authUser.id, name: user.display_name || user.clip_id,
      avatarColor: customization.bodyColor, position: startPos, targetPosition: startPos,
      isAdmin, isModerator, customization,
    });
  }, [authUser, user, isAdmin, isModerator, customization]);

  // Realtime presence
  useEffect(() => {
    if (!localUser) return;
    const channel = supabase.channel("plaza-presence", { config: { presence: { key: localUser.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PlazaUser[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key === localUser.id) return;
          const p = (presences as any[])[0];
          if (p) users.push({
            id: key, name: p.name || "User",
            avatarColor: p.customization?.bodyColor || p.avatarColor || "#999",
            position: p.position || [0, 0, 0], targetPosition: p.targetPosition || p.position || [0, 0, 0],
            message: p.message, messageTime: p.messageTime,
            isAdmin: p.isAdmin, isModerator: p.isModerator,
            customization: p.customization, isSpeaking: p.isSpeaking,
            emote: p.emote, emoteTime: p.emoteTime,
          });
        });
        setRemoteUsers(users);
      })
      .on("broadcast", { event: "plaza-chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev.slice(-99), {
          id: `${Date.now()}-${Math.random()}`, sender: payload.sender, senderId: payload.senderId,
          text: payload.text, time: Date.now(), replyTo: payload.replyTo,
          isWhisper: payload.isWhisper, whisperTo: payload.whisperTo, reactions: {},
        }]);
      })
      .on("broadcast", { event: "plaza-reaction" }, ({ payload }) => {
        setChatMessages(prev => prev.map(m => {
          if (m.id === payload.messageId) {
            const reactions = { ...m.reactions };
            if (!reactions[payload.emoji]) reactions[payload.emoji] = [];
            if (reactions[payload.emoji].includes(payload.userId)) {
              reactions[payload.emoji] = reactions[payload.emoji].filter(id => id !== payload.userId);
              if (reactions[payload.emoji].length === 0) delete reactions[payload.emoji];
            } else {
              reactions[payload.emoji] = [...reactions[payload.emoji], payload.userId];
            }
            return { ...m, reactions };
          }
          return m;
        }));
      })
      .on("broadcast", { event: "plaza-pin" }, ({ payload }) => {
        setChatMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, isPinned: true } : m));
      })
      .on("broadcast", { event: "plaza-delete" }, ({ payload }) => {
        setChatMessages(prev => prev.filter(m => m.id !== payload.messageId));
      })
      .on("broadcast", { event: "plaza-edit" }, ({ payload }) => {
        setChatMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, text: payload.text, edited: true } : m));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: localUser.name, avatarColor: localUser.avatarColor,
            position: localUser.position, targetPosition: localUser.targetPosition,
            isAdmin: localUser.isAdmin, isModerator: localUser.isModerator,
            customization: localUser.customization, isSpeaking: !isMuted,
          });
        }
      });
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [localUser?.id]);

  // Update presence
  useEffect(() => {
    if (!localUser || !channelRef.current) return;
    const timeout = setTimeout(() => {
      channelRef.current?.track({
        name: localUser.name, avatarColor: localUser.avatarColor,
        position: localUser.position, targetPosition: localUser.targetPosition,
        message: localUser.message, messageTime: localUser.messageTime,
        isAdmin: localUser.isAdmin, isModerator: localUser.isModerator,
        customization: localUser.customization, isSpeaking: !isMuted,
        emote: localUser.emote, emoteTime: localUser.emoteTime,
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, [localUser?.targetPosition, localUser?.message, localUser?.emote, isMuted]);

  // House channel
  useEffect(() => {
    if (!insideHouse || !authUser) return;
    const channel = supabase.channel(`house-${insideHouse}`);
    channel
      .on("broadcast", { event: "house-chat" }, ({ payload }) => {
        const msgPos: [number, number, number] = [-2 + Math.random() * 4, 1.5 + Math.random() * 1, -2 + Math.random() * 4];
        setHouseMessages(prev => [...prev.slice(-30), { id: `${Date.now()}-${Math.random()}`, sender: payload.sender, text: payload.text, time: Date.now(), position: msgPos }]);
      })
      .on("broadcast", { event: "house-object" }, ({ payload }) => {
        if (payload.action === "place") setPlacedObjects(prev => [...prev, payload.obj as PlacedObject]);
      })
      .subscribe();
    houseChannelRef.current = channel;
    return () => { channel.unsubscribe(); houseChannelRef.current = null; };
  }, [insideHouse, authUser?.id]);

  const handleMove = useCallback((position: [number, number, number]) => {
    if (!checkCollision(position[0], position[2])) {
      setLocalUser(prev => prev ? { ...prev, targetPosition: position } : prev);
    }
  }, []);

  const handleSendChat = useCallback(() => {
    if (!localUser || !channelRef.current) return;

    if (editingMsg) {
      const text = chatInput.trim();
      if (!text) return;
      channelRef.current.send({ type: "broadcast", event: "plaza-edit", payload: { messageId: editingMsg.id, text } });
      setChatMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text, edited: true } : m));
      setChatInput("");
      setEditingMsg(null);
      return;
    }

    const text = chatInput.trim();
    if (!text) return;

    const msg: ChatMsg = {
      id: `${Date.now()}-${Math.random()}`, sender: localUser.name, senderId: authUser?.id,
      text, time: Date.now(), reactions: {},
      replyTo: replyingTo ? { sender: replyingTo.sender, text: replyingTo.text.slice(0, 50) } : undefined,
      isWhisper: !!whisperTarget, whisperTo: whisperTarget || undefined,
    };

    channelRef.current.send({ type: "broadcast", event: "plaza-chat", payload: { sender: localUser.name, senderId: authUser?.id, text, replyTo: msg.replyTo, isWhisper: msg.isWhisper, whisperTo: msg.whisperTo } });
    setChatMessages(prev => [...prev.slice(-99), msg]);
    setLocalUser(prev => prev ? { ...prev, message: text, messageTime: Date.now() } : prev);
    setChatInput("");
    setReplyingTo(null);
    setWhisperTarget(null);
  }, [chatInput, localUser, editingMsg, replyingTo, whisperTarget, authUser?.id]);

  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!channelRef.current || !authUser?.id) return;
    channelRef.current.send({ type: "broadcast", event: "plaza-reaction", payload: { messageId, emoji, userId: authUser.id } });
    setChatMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = { ...m.reactions };
        if (!reactions[emoji]) reactions[emoji] = [];
        if (reactions[emoji].includes(authUser.id)) {
          reactions[emoji] = reactions[emoji].filter(id => id !== authUser.id);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...reactions[emoji], authUser.id];
        }
        return { ...m, reactions };
      }
      return m;
    }));
  }, [authUser?.id]);

  const handlePinMessage = useCallback((msg: ChatMsg) => {
    if (!channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "plaza-pin", payload: { messageId: msg.id } });
    setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: true } : m));
    setPinnedMessages(prev => [...prev, { ...msg, isPinned: true }]);
    toast.success("Message pinned!");
  }, []);

  const handleDeleteMessage = useCallback((msgId: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "plaza-delete", payload: { messageId: msgId } });
    setChatMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  const handleEmote = useCallback((emoteId: string) => {
    setLocalUser(prev => prev ? { ...prev, emote: emoteId, emoteTime: Date.now() } : prev);
    setEmotePickerOpen(false);
  }, []);

  // Handle mention input
  const handleChatInputChange = useCallback((value: string) => {
    setChatInput(value);
    const lastAt = value.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === value.length - 1 || (lastAt !== -1 && !value.slice(lastAt).includes(" "))) {
      setMentionSearch(value.slice(lastAt + 1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, []);

  const insertMention = useCallback((name: string) => {
    const lastAt = chatInput.lastIndexOf("@");
    setChatInput(chatInput.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
  }, [chatInput]);

  // House interactions
  const handleEnterHouse = useCallback((houseId: string) => {
    // Check if it's a user house
    if (houseId.startsWith("user-house-")) {
      const ownerId = houseId.replace("user-house-", "");
      const house = userHouses.find(h => h.user_id === ownerId);
      if (!house) return;

      // Check access: own house or friend's house
      if (ownerId !== authUser?.id) {
        const isFriend = friends.some(f =>
          (f.requester_id === ownerId || f.addressee_id === ownerId) && f.status === "accepted"
        );
        if (!isFriend) {
          toast.error("This house is locked! You need to be friends with the owner to enter.");
          return;
        }
      }

      setInsideHouse(house.id);
      setInsideHouseData({ name: house.house_name, color: house.house_color, ownerId: house.user_id });

      // Load placed objects from DB
      supabase.from("plaza_houses").select("placed_objects").eq("id", house.id).single().then(({ data }) => {
        if (data?.placed_objects) {
          try {
            const objects = typeof data.placed_objects === 'string'
              ? JSON.parse(data.placed_objects)
              : data.placed_objects;
            setPlacedObjects(Array.isArray(objects) ? objects : []);
          } catch { setPlacedObjects([]); }
        }
      });
    }
    setHouseMessages([]);
    setPlacingMode(null);
    setObjectMakerOpen(false);
  }, [userHouses, authUser?.id, friends]);

  const handleExitHouse = useCallback(() => {
    // Save placed objects to DB if it's your house
    if (insideHouse && insideHouseData?.ownerId === authUser?.id && placedObjects.length > 0) {
      supabase.from("plaza_houses").update({ placed_objects: placedObjects as any }).eq("id", insideHouse);
    }
    setInsideHouse(null);
    setInsideHouseData(null);
    setHouseMessages([]);
    setPlacedObjects([]);
    setPlacingMode(null);
    setObjectMakerOpen(false);
  }, [insideHouse, insideHouseData, authUser?.id, placedObjects]);

  const handleHouseSendChat = useCallback(() => {
    if (!houseChatInput.trim() || !localUser || !houseChannelRef.current) return;
    const text = houseChatInput.trim();
    const msgPos: [number, number, number] = [-2 + Math.random() * 4, 1.5 + Math.random() * 1, -2 + Math.random() * 4];
    houseChannelRef.current.send({ type: "broadcast", event: "house-chat", payload: { sender: localUser.name, text } });
    setHouseMessages(prev => [...prev.slice(-30), { id: `${Date.now()}`, sender: localUser.name, text, time: Date.now(), position: msgPos }]);
    setHouseChatInput("");
  }, [houseChatInput, localUser]);

  const handlePlaceObject = useCallback((obj: Omit<PlacedObject, "id">) => {
    const newObj: PlacedObject = { ...obj, id: `${Date.now()}-${Math.random()}` };
    setPlacedObjects(prev => [...prev, newObj]);
    houseChannelRef.current?.send({ type: "broadcast", event: "house-object", payload: { action: "place", obj: newObj } });
    setPlacingMode(null);
  }, []);

  const handleInteract = useCallback((id: InteractableId) => {
    if (id === "jukebox") { setJukeboxOpen(true); return; }
    if (id === "bulletin") { setBulletinOpen(true); return; }
    if (id === "game-station-1") { setGameDialogOpen("snake"); return; }
    if (id === "game-station-2") { setGameDialogOpen("tetris"); return; }
    if (id === "game-station-3") { setGameDialogOpen("memory"); return; }
    if (id.startsWith("user-house-")) { handleEnterHouse(id); return; }
  }, [handleEnterHouse]);

  const handleUserClick = useCallback((userId: string) => {
    setWhisperTarget(userId);
    const u = remoteUsers.find(r => r.id === userId);
    if (u) toast.info(`Whispering to ${u.name}. Messages will be private.`);
  }, [remoteUsers]);

  const handleCustomizationSave = useCallback((newCustom: AvatarCustomization) => {
    setCustomization(newCustom);
    setLocalUser(prev => prev ? { ...prev, customization: newCustom, avatarColor: newCustom.bodyColor } : prev);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  if (isLoading || !localUser) {
    return <div className="flex items-center justify-center h-screen bg-background"><p className="text-muted-foreground">Loading Plaza...</p></div>;
  }

  const WeatherIcon = WEATHER_ICONS[weather.type] || Sun;
  const filteredMessages = searchQuery
    ? chatMessages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender.toLowerCase().includes(searchQuery.toLowerCase()))
    : chatMessages;

  const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👀", "😢"];

  const mentionableUsers = [localUser, ...remoteUsers].filter(u =>
    mentionSearch ? u.name.toLowerCase().includes(mentionSearch.toLowerCase()) : true
  ).slice(0, 5);

  // === RENDER HOUSE INTERIOR ===
  if (insideHouse && insideHouseData) {
    const isOwner = insideHouseData.ownerId === authUser?.id;
    return (
      <div className="h-screen w-screen relative overflow-hidden">
        <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading interior...</p></div>}>
          <HouseInterior houseName={insideHouseData.name} houseColor={insideHouseData.color} messages={houseMessages} placedObjects={placedObjects} onPlaceObject={handlePlaceObject} onExit={handleExitHouse} placingMode={placingMode} userName={localUser.name} customization={customization} />
        </Suspense>

        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <Button variant="secondary" size="sm" onClick={handleExitHouse} className="shadow-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Exit</Button>
          <Badge variant="secondary" className="shadow-lg">🏠 {insideHouseData.name}</Badge>
          {!isOwner && <Badge variant="outline" className="shadow-lg">👋 Visiting</Badge>}
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {isOwner && (
            <Button variant={objectMakerOpen ? "default" : "secondary"} size="sm" onClick={() => { setObjectMakerOpen(!objectMakerOpen); setPlacingMode(null); }} className="shadow-lg">
              <Hammer className="h-4 w-4 mr-1" /> Decorate
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setChatOpen(!chatOpen)} className="shadow-lg"><MessageSquare className="h-4 w-4" /></Button>
        </div>

        {placingMode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
            <Badge variant="default" className="shadow-lg text-sm px-4 py-2 animate-pulse">
              Click to place {PLACEABLE_OBJECTS.find(o => o.type === placingMode.type)?.label || placingMode.type}
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-2" onClick={() => setPlacingMode(null)}><X className="h-3 w-3" /></Button>
            </Badge>
          </div>
        )}

        {objectMakerOpen && isOwner && (
          <div className="absolute left-4 top-16 z-20 bg-card/95 backdrop-blur-sm border rounded-lg shadow-xl w-72 max-h-[70vh] overflow-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="text-sm font-medium">🛠️ Object Maker</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setObjectMakerOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Choose Object</p>
                <div className="grid grid-cols-2 gap-1">
                  {PLACEABLE_OBJECTS.map(obj => (
                    <Button key={obj.type} variant={selectedObjectType === obj.type ? "default" : "outline"} size="sm" className="text-xs justify-start h-8" onClick={() => setSelectedObjectType(obj.type)}>{obj.label}</Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Choose Color</p>
                <div className="flex flex-wrap gap-1">
                  {OBJECT_COLORS.map(color => (
                    <button key={color} className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedObjectColor === color ? "border-primary scale-125" : "border-transparent"}`} style={{ backgroundColor: color }} onClick={() => setSelectedObjectColor(color)} />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => { setPlacingMode({ type: selectedObjectType, color: selectedObjectColor }); setObjectMakerOpen(false); }}>
                <Hammer className="h-4 w-4 mr-1" /> Place Object
              </Button>
            </div>
          </div>
        )}

        {chatOpen && (
          <div className="absolute right-4 bottom-4 w-80 bg-card/90 backdrop-blur-sm border rounded-lg shadow-xl z-10 flex flex-col" style={{ maxHeight: "50vh" }}>
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">💬 {insideHouseData.name} Chat</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatOpen(false)}>✕</Button>
            </div>
            <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(50vh - 80px)" }}>
              <div className="space-y-1">
                {houseMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Messages appear as 3D bubbles! 💬</p>}
                {houseMessages.map(msg => (
                  <div key={msg.id} className="text-xs"><span className="font-semibold text-primary">{msg.sender}: </span><span className="text-foreground">{msg.text}</span></div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-2 border-t flex gap-1">
              <Input placeholder="Say something..." value={houseChatInput} onChange={e => setHouseChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleHouseSendChat()} className="h-8 text-xs" />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleHouseSendChat}><Send className="h-3 w-3" /></Button>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 z-10">
          <Badge variant="secondary" className="shadow-lg text-xs">Click floor to move • {isOwner ? "Use Decorate to place objects" : "You're visiting!"}</Badge>
        </div>
      </div>
    );
  }

  // === RENDER PLAZA ===
  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading 3D world...</p></div>}>
        <PlazaScene localUser={localUser} remoteUsers={remoteUsers} onMove={handleMove} onUserClick={handleUserClick} onInteract={handleInteract} userHouses={userHouses} weather={weather} />
      </Suspense>

      {/* Top bar */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-10 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => navigate("/")} className="shadow-lg"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Badge variant="secondary" className="shadow-lg"><Users className="h-3 w-3 mr-1" />{remoteUsers.length + 1} online</Badge>
        {activeConnections.length > 0 && <Badge variant="default" className="shadow-lg">🎤 {activeConnections.length} in voice</Badge>}
        <Badge variant="outline" className="shadow-lg">
          <WeatherIcon className="h-3 w-3 mr-1" />
          {weather.type.charAt(0).toUpperCase() + weather.type.slice(1)} {Math.round(weather.temperature)}°C
        </Badge>
      </div>

      {/* Right controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setEmotePickerOpen(!emotePickerOpen)} className="shadow-lg"><Smile className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" onClick={() => setCustomizerOpen(true)} className="shadow-lg"><Palette className="h-4 w-4" /></Button>
        <Button variant={isMuted ? "secondary" : "default"} size="sm" onClick={toggleMute} className="shadow-lg">{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
        <Button variant={plazaMusic.isPlaying ? "default" : "secondary"} size="sm" onClick={plazaMusic.togglePlay} className="shadow-lg">
          {plazaMusic.isPlaying ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setChatOpen(!chatOpen)} className="shadow-lg"><MessageSquare className="h-4 w-4" /></Button>
      </div>

      {/* Emote picker */}
      {emotePickerOpen && (
        <div className="absolute top-14 right-4 z-20 bg-card/95 backdrop-blur-sm border rounded-lg shadow-xl p-2 grid grid-cols-4 gap-1">
          {EMOTES.map(e => (
            <Button key={e.id} variant="ghost" size="sm" className="text-lg h-10 w-10 p-0" onClick={() => handleEmote(e.id)}>{e.emoji}</Button>
          ))}
        </div>
      )}

      {/* Whisper indicator */}
      {whisperTarget && (
        <div className="absolute top-14 left-4 z-20">
          <Badge variant="default" className="shadow-lg">
            <Lock className="h-3 w-3 mr-1" /> Whispering to {remoteUsers.find(u => u.id === whisperTarget)?.name || "user"}
            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0" onClick={() => setWhisperTarget(null)}><X className="h-3 w-3" /></Button>
          </Badge>
        </div>
      )}

      {/* Nearby interactable hint */}
      {localUser && (() => {
        const nearby = getNearbyInteractable(localUser.targetPosition[0], localUser.targetPosition[2]);
        if (!nearby) return null;
        let label = nearby;
        if (nearby === "jukebox") label = "🎵 Jukebox";
        else if (nearby === "bulletin") label = "📋 Bulletin Board";
        else if (nearby.startsWith("game-station")) label = "🎮 Game Station";
        else if (nearby.startsWith("user-house-")) {
          const h = userHouses.find(h => `user-house-${h.user_id}` === nearby);
          label = h ? `🏠 ${h.owner_name}'s House` : "🏠 House";
        }
        return (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
            <Badge variant="default" className="shadow-lg text-sm px-4 py-2 animate-pulse">Click to interact with {label}</Badge>
          </div>
        );
      })()}

      <div className="absolute bottom-4 left-4 z-10">
        <Badge variant="secondary" className="shadow-lg text-xs">Click to move • Walk near objects to interact • Click avatars to whisper</Badge>
      </div>

      {/* Enhanced Chat panel */}
      {chatOpen && (
        <div className="absolute right-4 bottom-4 w-96 bg-card/90 backdrop-blur-sm border rounded-lg shadow-xl z-10 flex flex-col" style={{ maxHeight: "60vh" }}>
          <div className="p-2 border-b flex items-center justify-between gap-1">
            <span className="text-sm font-medium">Plaza Chat</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSearchOpen(!searchOpen)}><Search className="h-3 w-3" /></Button>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><Pin className="h-3 w-3" /></Button></PopoverTrigger>
                <PopoverContent className="w-72 max-h-60 overflow-auto">
                  <p className="text-xs font-medium mb-2">📌 Pinned Messages</p>
                  {pinnedMessages.length === 0 && <p className="text-xs text-muted-foreground">No pinned messages</p>}
                  {pinnedMessages.map(m => (
                    <div key={m.id} className="text-xs p-1 border-b"><span className="font-semibold">{m.sender}:</span> {m.text}</div>
                  ))}
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatOpen(false)}>✕</Button>
            </div>
          </div>

          {searchOpen && (
            <div className="px-2 py-1 border-b">
              <Input placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-7 text-xs" />
            </div>
          )}

          <ScrollArea className="flex-1 p-2" style={{ maxHeight: "calc(60vh - 110px)" }}>
            <div className="space-y-1.5">
              {filteredMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No messages yet. Say hello! 👋</p>}
              {filteredMessages.map(msg => {
                // Filter whispers: only show if you're sender or recipient
                if (msg.isWhisper && msg.senderId !== authUser?.id && msg.whisperTo !== authUser?.id) return null;

                return (
                  <div key={msg.id} className={`text-xs group relative ${msg.isPinned ? "border-l-2 border-primary pl-1" : ""} ${msg.isWhisper ? "bg-muted/50 rounded px-1 py-0.5 italic" : ""}`}>
                    {msg.replyTo && (
                      <div className="text-[10px] text-muted-foreground border-l-2 border-muted pl-1 mb-0.5">↩ {msg.replyTo.sender}: {msg.replyTo.text}</div>
                    )}
                    <div className="flex items-start gap-1">
                      <div className="flex-1">
                        {msg.isWhisper && <Lock className="h-2.5 w-2.5 inline mr-0.5" />}
                        <span className="font-semibold text-primary">{msg.sender}: </span>
                        <span className="text-foreground">{msg.text}</span>
                        {msg.edited && <span className="text-muted-foreground text-[10px] ml-1">(edited)</span>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setReplyingTo(msg); }}><Reply className="h-3 w-3" /></Button>
                        {msg.senderId === authUser?.id && <>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingMsg(msg); setChatInput(msg.text); }}><Edit2 className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteMessage(msg.id)}><Trash2 className="h-3 w-3" /></Button>
                        </>}
                        {(isAdmin || isModerator) && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handlePinMessage(msg)}><Pin className="h-3 w-3" /></Button>}
                      </div>
                    </div>
                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button key={emoji} className={`text-[10px] px-1 py-0.5 rounded-full border ${users.includes(authUser?.id || '') ? 'bg-primary/20 border-primary' : 'border-muted'}`} onClick={() => handleReaction(msg.id, emoji)}>
                            {emoji} {users.length}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Quick reaction bar on hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 mt-0.5">
                      {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} className="text-xs hover:scale-125 transition-transform" onClick={() => handleReaction(msg.id, emoji)}>{emoji}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Reply/edit indicator */}
          {(replyingTo || editingMsg) && (
            <div className="px-2 py-1 border-t bg-muted/50 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground truncate">
                {editingMsg ? `✏️ Editing message` : `↩ Replying to ${replyingTo?.sender}: ${replyingTo?.text.slice(0, 30)}`}
              </span>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => { setReplyingTo(null); setEditingMsg(null); setChatInput(""); }}><X className="h-3 w-3" /></Button>
            </div>
          )}

          {/* Mention suggestions */}
          {showMentions && mentionableUsers.length > 0 && (
            <div className="px-2 py-1 border-t bg-card">
              {mentionableUsers.map(u => (
                <button key={u.id} className="block w-full text-left text-xs px-2 py-1 hover:bg-muted rounded" onClick={() => insertMention(u.name)}>
                  <AtSign className="h-3 w-3 inline mr-1" />{u.name}
                </button>
              ))}
            </div>
          )}

          <div className="p-2 border-t flex gap-1">
            <Input placeholder={whisperTarget ? "Whisper..." : "Say something... (@mention)"} value={chatInput} onChange={e => handleChatInputChange(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendChat()} className="h-8 text-xs" />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSendChat}><Send className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {/* Jukebox Dialog */}
      <Dialog open={jukeboxOpen} onOpenChange={setJukeboxOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🎵 Jukebox</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Now Playing */}
            <div className="p-3 rounded-lg bg-muted/50 text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Now Playing</p>
              <p className="text-sm font-medium">{plazaMusic.currentTrack.emoji} {plazaMusic.currentTrack.title}</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={plazaMusic.prevTrack}><SkipBack className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" className="h-10 w-10" onClick={plazaMusic.togglePlay}>
                  {plazaMusic.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={plazaMusic.nextTrack}><SkipForward className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2 px-2">
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => plazaMusic.setIsMusicMuted(!plazaMusic.isMusicMuted)}>
                  {plazaMusic.isMusicMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
                <Slider value={[plazaMusic.isMusicMuted ? 0 : plazaMusic.volume * 100]} max={100} step={1} onValueChange={(v) => { plazaMusic.setVolume(v[0] / 100); plazaMusic.setIsMusicMuted(false); }} className="flex-1" />
              </div>
            </div>
            {/* Track List */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tracks</p>
              {PLAZA_TRACKS.map(track => (
                <Button key={track.id} variant={plazaMusic.currentTrack.id === track.id ? "default" : "outline"} className="w-full justify-start gap-2" size="sm"
                  onClick={() => plazaMusic.playTrack(track)}>
                  <span>{track.emoji}</span>
                  <span className="flex-1 text-left">{track.title}</span>
                  {!track.url && <Badge variant="outline" className="text-[10px] py-0">Soon</Badge>}
                  {plazaMusic.currentTrack.id === track.id && plazaMusic.isPlaying && <span className="text-xs animate-pulse">♪</span>}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulletin Board Dialog */}
      <Dialog open={bulletinOpen} onOpenChange={setBulletinOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>📋 Bulletin Board</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {announcements.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>}
              {announcements.map(a => (
                <div key={a.id} className="p-3 border rounded-lg bg-muted/50">
                  <p className="text-sm">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Game Dialog */}
      <Dialog open={!!gameDialogOpen} onOpenChange={() => setGameDialogOpen(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>🎮 {gameDialogOpen?.charAt(0).toUpperCase()}{gameDialogOpen?.slice(1)}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Ready to play {gameDialogOpen}?</p>
            <Button className="w-full" onClick={() => { setGameDialogOpen(null); navigate("/"); }}>Play in Chat Room</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AvatarCustomizer isOpen={customizerOpen} onClose={() => setCustomizerOpen(false)} userId={authUser?.id || ""} currentCustomization={customization} onSave={handleCustomizationSave} />
    </div>
  );
};

export default Plaza;
