import { useState, useEffect } from 'react';
import { X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBonziBuddy } from '@/hooks/useBonziBuddy';
import { cn } from '@/lib/utils';

interface BonziBuddyProps {
  enabled: boolean;
  chaosLevel: number;
  userName: string;
}

const BonziBuddy = ({ enabled, chaosLevel, userName }: BonziBuddyProps) => {
  const { isVisible, currentAction, position, dismiss } = useBonziBuddy(enabled, chaosLevel, userName);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (currentAction?.type === 'confetti') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), currentAction.duration || 3000);
    }
  }, [currentAction]);

  if (!enabled || !isVisible) return null;

  return (
    <>
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60]">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#ff0', '#f0f', '#0ff', '#0f0', '#f00'][Math.floor(Math.random() * 5)],
                width: '10px',
                height: '10px',
              }}
            />
          ))}
        </div>
      )}

      {/* Bonzi character */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300",
          "animate-bounce-slow"
        )}
        style={{ left: position.x, top: position.y }}
      >
        <div className="relative">
          {/* Speech bubble */}
          {currentAction?.message && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-card border border-border rounded-lg shadow-lg">
              <p className="text-sm">{currentAction.message}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-border" />
            </div>
          )}

          {/* Character */}
          <div className="relative w-24 h-24 bg-gradient-to-b from-purple-600 to-purple-800 rounded-full shadow-lg border-4 border-purple-400 flex items-center justify-center">
            {/* Eyes */}
            <div className="absolute top-6 left-4 w-4 h-4 bg-white rounded-full">
              <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full animate-look" />
            </div>
            <div className="absolute top-6 right-4 w-4 h-4 bg-white rounded-full">
              <div className="absolute top-1 left-1 w-2 h-2 bg-black rounded-full animate-look" />
            </div>
            {/* Mouth */}
            <div className="absolute bottom-6 w-8 h-4 bg-pink-400 rounded-full" />
            {/* Antennae */}
            <div className="absolute -top-4 left-6 w-1 h-6 bg-purple-400 rounded-full transform -rotate-12">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full" />
            </div>
            <div className="absolute -top-4 right-6 w-1 h-6 bg-purple-400 rounded-full transform rotate-12">
              <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full" />
            </div>
          </div>

          {/* Dismiss button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full"
            onClick={dismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default BonziBuddy;
