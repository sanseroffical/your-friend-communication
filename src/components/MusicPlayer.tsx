import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Shuffle, Repeat, X, Radio, ListMusic, Plus, Trash2, Upload
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
}

const AMBIENT_TRACKS: Track[] = [
  { id: "lofi1", title: "Lo-Fi Chill", artist: "Ambient", url: "https://cdn.pixabay.com/audio/2024/11/29/audio_7e4f35b55f.mp3" },
  { id: "lofi2", title: "Rainy Day", artist: "Ambient", url: "https://cdn.pixabay.com/audio/2024/09/10/audio_6e0e588bc1.mp3" },
  { id: "lofi3", title: "Study Beats", artist: "Ambient", url: "https://cdn.pixabay.com/audio/2024/02/14/audio_8e153ac11a.mp3" },
  { id: "lofi4", title: "Cozy Evening", artist: "Ambient", url: "https://cdn.pixabay.com/audio/2023/10/16/audio_d516941840.mp3" },
];

interface MusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  profileAnthem?: string | null;
  onSetAnthem?: (url: string) => void;
  userId?: string;
}

const MusicPlayer = ({ isOpen, onClose, profileAnthem, onSetAnthem, userId }: MusicPlayerProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [anthemUrl, setAnthemUrl] = useState(profileAnthem || "");
  const [customTracks, setCustomTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem("custom_tracks");
    return saved ? JSON.parse(saved) : [];
  });
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume / 100;

    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("ended", handleTrackEnd);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("ended", handleTrackEnd);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const allTracks = [...AMBIENT_TRACKS, ...customTracks];

  const handleTrackEnd = () => {
    if (repeat) {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play();
    } else {
      playNext();
    }
  };

  const playTrack = (track: Track) => {
    if (!audioRef.current) return;
    audioRef.current.src = track.url;
    audioRef.current.play().catch(() => {});
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) {
      if (allTracks.length > 0) playTrack(allTracks[0]);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack?.id);
    let nextIndex = shuffle
      ? Math.floor(Math.random() * allTracks.length)
      : (currentIndex + 1) % allTracks.length;
    playTrack(allTracks[nextIndex]);
  };

  const playPrev = () => {
    if (allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack?.id);
    let prevIndex = currentIndex <= 0 ? allTracks.length - 1 : currentIndex - 1;
    playTrack(allTracks[prevIndex]);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSetAnthem = () => {
    if (anthemUrl.trim() && onSetAnthem) {
      onSetAnthem(anthemUrl.trim());
    }
  };

  const addCustomTrack = () => {
    if (!newTrackUrl.trim()) return;
    const track: Track = {
      id: `custom-${Date.now()}`,
      title: newTrackTitle.trim() || "Custom Track",
      artist: "Custom",
      url: newTrackUrl.trim(),
    };
    const updated = [...customTracks, track];
    setCustomTracks(updated);
    localStorage.setItem("custom_tracks", JSON.stringify(updated));
    setNewTrackUrl("");
    setNewTrackTitle("");
  };

  const removeCustomTrack = (id: string) => {
    const updated = customTracks.filter(t => t.id !== id);
    setCustomTracks(updated);
    localStorage.setItem("custom_tracks", JSON.stringify(updated));
    if (currentTrack?.id === id) {
      audioRef.current?.pause();
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          Music Player
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        {/* Now Playing */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{currentTrack?.title || "No track selected"}</p>
            <p className="text-xs text-muted-foreground">{currentTrack?.artist || "—"}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Slider value={[currentTime]} max={duration || 100} step={1} onValueChange={handleSeek} className="w-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShuffle(!shuffle)}>
            <Shuffle className={`h-4 w-4 ${shuffle ? "text-primary" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrev}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-10 w-10 rounded-full" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRepeat(!repeat)}>
            <Repeat className={`h-4 w-4 ${repeat ? "text-primary" : ""}`} />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }} className="flex-1" />
        </div>

        <Tabs defaultValue="ambient" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="ambient" className="flex-1 text-xs">
              <Radio className="h-3 w-3 mr-1" /> Ambient
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1 text-xs">
              <ListMusic className="h-3 w-3 mr-1" /> My Music
            </TabsTrigger>
            <TabsTrigger value="anthem" className="flex-1 text-xs">
              <Music className="h-3 w-3 mr-1" /> Anthem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ambient" className="mt-2">
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {AMBIENT_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-sm hover:bg-muted transition-colors ${
                      currentTrack?.id === track.id ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-3 w-3 shrink-0" />
                    ) : (
                      <Play className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate text-left">{track.title}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">{track.artist}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-2 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*";
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Max 10MB per track", variant: "destructive" });
                    return;
                  }
                  const ext = file.name.split(".").pop();
                  const path = `${userId || "anon"}/music-${Date.now()}.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from("chat-attachments")
                    .upload(path, file);
                  if (uploadError) {
                    toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
                    return;
                  }
                  const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
                  const track: Track = {
                    id: `custom-${Date.now()}`,
                    title: file.name.replace(/\.[^.]+$/, ""),
                    artist: "Uploaded",
                    url: urlData.publicUrl,
                  };
                  const updated = [...customTracks, track];
                  setCustomTracks(updated);
                  localStorage.setItem("custom_tracks", JSON.stringify(updated));
                  toast({ title: "Track uploaded! 🎵" });
                };
                input.click();
              }}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload Audio File
            </Button>
            <div className="flex gap-1">
              <Input placeholder="Track name" value={newTrackTitle} onChange={(e) => setNewTrackTitle(e.target.value)} className="text-xs h-8" />
              <Input placeholder="Audio URL" value={newTrackUrl} onChange={(e) => setNewTrackUrl(e.target.value)} className="text-xs h-8 flex-1" />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={addCustomTrack} disabled={!newTrackUrl.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {customTracks.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No custom tracks yet</p>
                )}
                {customTracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <button
                      onClick={() => playTrack(track)}
                      className={`flex-1 flex items-center gap-2 p-2 rounded text-sm hover:bg-muted ${
                        currentTrack?.id === track.id ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <Play className="h-3 w-3 shrink-0" />
                      <span className="truncate text-left text-xs">{track.title}</span>
                    </button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeCustomTrack(track.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="anthem" className="mt-2 space-y-3">
            <p className="text-xs text-muted-foreground">Set a song that plays when people visit your profile.</p>
            
            {/* Upload audio file */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Upload audio file</label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "audio/*";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ title: "File too large", description: "Max 10MB for anthems", variant: "destructive" });
                        return;
                      }
                      const ext = file.name.split(".").pop();
                      const path = `${userId || "anon"}/${Date.now()}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from("chat-attachments")
                        .upload(path, file);
                      if (uploadError) {
                        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
                        return;
                      }
                      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
                      const url = urlData.publicUrl;
                      setAnthemUrl(url);
                      if (onSetAnthem) onSetAnthem(url);
                      toast({ title: "Anthem uploaded! 🎵" });
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload Audio File
                </Button>
              </div>
            </div>

            {/* Or paste URL */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Or paste a URL</label>
              <div className="flex gap-1">
                <Input
                  placeholder="Paste audio URL for your anthem"
                  value={anthemUrl}
                  onChange={(e) => setAnthemUrl(e.target.value)}
                  className="text-xs h-8"
                />
                <Button size="sm" className="h-8 shrink-0" onClick={handleSetAnthem} disabled={!anthemUrl.trim()}>
                  Set
                </Button>
              </div>
            </div>

            {profileAnthem && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Music className="h-3 w-3 text-primary" />
                <span className="text-xs truncate flex-1">Current anthem set</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => playTrack({ id: "anthem", title: "My Anthem", artist: "Me", url: profileAnthem })}>
                  <Play className="h-3 w-3 mr-1" /> Preview
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { 
                  if (onSetAnthem) onSetAnthem(""); 
                  setAnthemUrl(""); 
                }}>
                  Remove
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MusicPlayer;
