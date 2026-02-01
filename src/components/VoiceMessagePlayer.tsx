import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
}

const VoiceMessagePlayer = ({ audioUrl, duration = 0 }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg min-w-[200px]">
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlayPause}
        className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        {/* Waveform visualization (simplified) */}
        <div className="flex items-center gap-0.5 h-6">
          {[...Array(30)].map((_, i) => {
            const height = Math.sin(i * 0.5) * 0.5 + 0.5;
            const isActive = (i / 30) * 100 <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                style={{ height: `${8 + height * 16}px` }}
              />
            );
          })}
        </div>

        <Slider
          value={[currentTime]}
          max={audioDuration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
      </div>

      <span className="text-xs text-muted-foreground font-mono min-w-[40px]">
        {formatTime(isPlaying ? currentTime : audioDuration)}
      </span>
    </div>
  );
};

export default VoiceMessagePlayer;
