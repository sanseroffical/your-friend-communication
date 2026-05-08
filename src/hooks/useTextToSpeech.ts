import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const TTS_VOICES: { id: string; name: string }[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George (warm)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
];

const VOICE_KEY = "tts_voice_id";
const cache = new Map<string, string>(); // text|voice -> objectURL

export function useTextToSpeech() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const getVoice = useCallback(() => {
    if (typeof window === "undefined") return TTS_VOICES[0].id;
    return localStorage.getItem(VOICE_KEY) || TTS_VOICES[0].id;
  }, []);

  const setVoice = useCallback((voiceId: string) => {
    localStorage.setItem(VOICE_KEY, voiceId);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, voiceIdOverride?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const voiceId = voiceIdOverride || getVoice();
      const cacheKey = `${voiceId}|${trimmed}`;

      stop();
      setIsLoading(true);
      try {
        let url = cache.get(cacheKey);
        if (!url) {
          const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
            body: { text: trimmed.slice(0, 2000), voiceId },
          });
          if (error) throw error;
          if (!data?.audioContent) throw new Error("No audio returned");
          url = `data:audio/mpeg;base64,${data.audioContent}`;
          cache.set(cacheKey, url);
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => setIsPlaying(false);
        await audio.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error("TTS failed:", err);
        toast({
          title: "Couldn't read aloud",
          description: err?.message || "Text-to-speech failed.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [getVoice, stop, toast],
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, isLoading, isPlaying, getVoice, setVoice };
}
