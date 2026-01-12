import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { StoryGroup, Story } from '@/hooks/useStories';
import { formatDistanceToNow } from 'date-fns';
import StoryReactions from './StoryReactions';

interface StoryViewerProps {
  storyGroup: StoryGroup;
  isOwner: boolean;
  currentUserId: string | null;
  onClose: () => void;
  onViewStory: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
}

const StoryViewer = ({
  storyGroup,
  isOwner,
  currentUserId,
  onClose,
  onViewStory,
  onDeleteStory
}: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentStory = storyGroup.stories[currentIndex];
  const isVideo = currentStory?.media_type === 'video';
  const storyDuration = isVideo ? 30000 : 5000; // 30s for videos, 5s for images

  useEffect(() => {
    if (!currentStory) return;
    
    onViewStory(currentStory.id);
    setProgress(0);

    if (!isPaused) {
      startTimer();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const interval = 50;
    const increment = (interval / storyDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);
  };

  const goToNext = () => {
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDelete = () => {
    onDeleteStory(currentStory.id);
    if (storyGroup.stories.length === 1) {
      onClose();
    } else if (currentIndex === storyGroup.stories.length - 1) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleMouseDown = () => {
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleMouseUp = () => {
    setIsPaused(false);
    startTimer();
    if (videoRef.current) videoRef.current.play();
  };

  const getTimeRemaining = () => {
    const expiresAt = new Date(currentStory.expires_at);
    return formatDistanceToNow(expiresAt, { addSuffix: true });
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
        {storyGroup.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-50"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-white/50">
            <AvatarImage src={storyGroup.avatarUrl || undefined} />
            <AvatarFallback>{storyGroup.userName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-white">
            <p className="text-sm font-medium">{storyGroup.userName}</p>
            <p className="text-xs text-white/70 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expires {getTimeRemaining()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleDelete}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Story Content */}
      <div
        className="relative w-full h-full max-w-md max-h-[80vh] mx-auto"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.media_url || ''}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <img
            src={currentStory.media_url || ''}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}

        {/* Caption */}
        {currentStory.content && (
          <div className="absolute bottom-32 left-4 right-4 text-center">
            <p className="text-white text-lg font-medium drop-shadow-lg bg-black/30 rounded-lg px-3 py-2">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Story Reactions */}
        <StoryReactions
          storyId={currentStory.id}
          storyOwnerId={storyGroup.userId}
          currentUserId={currentUserId}
        />

        {/* Navigation Areas */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full"
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full"
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
        />
      </div>

      {/* Navigation Arrows (desktop) */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 hidden sm:flex"
        onClick={goToPrev}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 hidden sm:flex"
        onClick={goToNext}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>
    </div>
  );
};

export default StoryViewer;
