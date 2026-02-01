import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceMessageRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number;
}

const VoiceMessageRecorder = ({ onRecordingComplete, maxDuration = 60 }: VoiceMessageRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analyser
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        onRecordingComplete(audioBlob, duration);
        setDuration(0);
        setAudioLevel(0);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start audio level updates
      updateAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    cleanup();
  }, [cleanup]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      {isRecording ? (
        <>
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono text-red-500">
              {formatTime(duration)}
            </span>
          </div>

          {/* Audio level visualization */}
          <div className="flex items-center gap-0.5 h-6">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.min(24, audioLevel * 24 * (1 + Math.random() * 0.5)))}px`,
                  opacity: i < audioLevel * 10 ? 1 : 0.3
                }}
              />
            ))}
          </div>

          {/* Stop button */}
          <Button
            size="icon"
            variant="destructive"
            onClick={stopRecording}
            className="rounded-full"
          >
            <Square className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          onClick={startRecording}
          className="rounded-full hover:bg-primary/10"
          title="Record voice message"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};

export default VoiceMessageRecorder;
