import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MoodStatusProps {
  currentMood?: string;
  onMoodChange?: (mood: string) => void;
  readOnly?: boolean;
}

const MOODS = [
  { emoji: '😊', label: 'Happy', color: 'bg-green-500/20 text-green-500' },
  { emoji: '😔', label: 'Sad', color: 'bg-blue-500/20 text-blue-500' },
  { emoji: '😴', label: 'Tired', color: 'bg-purple-500/20 text-purple-500' },
  { emoji: '🤔', label: 'Thinking', color: 'bg-yellow-500/20 text-yellow-500' },
  { emoji: '😤', label: 'Frustrated', color: 'bg-red-500/20 text-red-500' },
  { emoji: '🎉', label: 'Celebrating', color: 'bg-pink-500/20 text-pink-500' },
  { emoji: '💻', label: 'Working', color: 'bg-cyan-500/20 text-cyan-500' },
  { emoji: '🎮', label: 'Gaming', color: 'bg-indigo-500/20 text-indigo-500' },
  { emoji: '📚', label: 'Studying', color: 'bg-orange-500/20 text-orange-500' },
  { emoji: '🎵', label: 'Vibing', color: 'bg-violet-500/20 text-violet-500' },
  { emoji: '☕', label: 'Coffee time', color: 'bg-amber-500/20 text-amber-500' },
  { emoji: '🏃', label: 'Busy', color: 'bg-emerald-500/20 text-emerald-500' },
  { emoji: '😎', label: 'Chilling', color: 'bg-teal-500/20 text-teal-500' },
  { emoji: '❤️', label: 'In love', color: 'bg-rose-500/20 text-rose-500' },
  { emoji: '🌙', label: 'Night owl', color: 'bg-slate-500/20 text-slate-500' },
];

const MoodStatus = ({ currentMood, onMoodChange, readOnly = false }: MoodStatusProps) => {
  const [open, setOpen] = useState(false);
  
  const selectedMood = MOODS.find(m => m.label === currentMood);

  const handleMoodSelect = (mood: typeof MOODS[0]) => {
    onMoodChange?.(mood.label);
    setOpen(false);
  };

  if (readOnly) {
    if (!selectedMood) return null;
    return (
      <Badge variant="secondary" className={`${selectedMood.color} gap-1`}>
        <span>{selectedMood.emoji}</span>
        <span>{selectedMood.label}</span>
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {selectedMood ? (
            <>
              <span>{selectedMood.emoji}</span>
              <span>{selectedMood.label}</span>
            </>
          ) : (
            <>
              <span>😊</span>
              <span className="text-muted-foreground">Set mood</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <p className="text-sm font-medium mb-2">How are you feeling?</p>
        <div className="grid grid-cols-3 gap-1">
          {MOODS.map((mood) => (
            <button
              key={mood.label}
              onClick={() => handleMoodSelect(mood)}
              className={`
                flex flex-col items-center p-2 rounded-lg transition-colors
                hover:bg-muted
                ${currentMood === mood.label ? 'bg-muted ring-2 ring-primary' : ''}
              `}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{mood.label}</span>
            </button>
          ))}
        </div>
        {currentMood && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              onMoodChange?.('');
              setOpen(false);
            }}
          >
            Clear mood
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MoodStatus;
