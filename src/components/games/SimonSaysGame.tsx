import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
type Color = typeof COLORS[number];

const SimonSaysGame = () => {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const colorClasses: Record<Color, { base: string; active: string }> = {
    red: { base: 'bg-red-600/70', active: 'bg-red-500 ring-4 ring-red-300' },
    blue: { base: 'bg-blue-600/70', active: 'bg-blue-500 ring-4 ring-blue-300' },
    green: { base: 'bg-green-600/70', active: 'bg-green-500 ring-4 ring-green-300' },
    yellow: { base: 'bg-yellow-500/70', active: 'bg-yellow-400 ring-4 ring-yellow-200' },
  };

  const addToSequence = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setSequence(prev => [...prev, randomColor]);
  }, []);

  const showSequence = useCallback(async () => {
    setIsShowingSequence(true);
    setPlayerSequence([]);

    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setActiveColor(sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
      setActiveColor(null);
    }

    setIsShowingSequence(false);
  }, [sequence]);

  useEffect(() => {
    if (sequence.length > 0 && isPlaying) {
      showSequence();
    }
  }, [sequence, showSequence, isPlaying]);

  const handleColorClick = (color: Color) => {
    if (isShowingSequence || gameOver || !isPlaying) return;

    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 200);

    const newPlayerSequence = [...playerSequence, color];
    setPlayerSequence(newPlayerSequence);

    const currentIndex = newPlayerSequence.length - 1;
    if (newPlayerSequence[currentIndex] !== sequence[currentIndex]) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) {
        setHighScore(score);
      }
      return;
    }

    if (newPlayerSequence.length === sequence.length) {
      setScore(prev => prev + 1);
      setTimeout(() => {
        addToSequence();
      }, 1000);
    }
  };

  const startGame = () => {
    setSequence([]);
    setPlayerSequence([]);
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    setTimeout(() => {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      setSequence([randomColor]);
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between w-full max-w-[200px]">
        <div className="text-sm">
          <span className="text-muted-foreground">Score: </span>
          <span className="font-bold">{score}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Best: </span>
          <span className="font-bold">{highScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-[200px] h-[200px]">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            disabled={isShowingSequence || gameOver || !isPlaying}
            className={`rounded-lg transition-all duration-150 ${
              activeColor === color ? colorClasses[color].active : colorClasses[color].base
            } ${!isPlaying || isShowingSequence ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
          />
        ))}
      </div>

      {!isPlaying && (
        <Button onClick={startGame} className="w-full max-w-[200px]">
          {gameOver ? 'Play Again' : 'Start Game'}
        </Button>
      )}

      {isShowingSequence && (
        <p className="text-sm text-muted-foreground animate-pulse">Watch the pattern...</p>
      )}

      {isPlaying && !isShowingSequence && !gameOver && (
        <p className="text-sm text-muted-foreground">Your turn! ({playerSequence.length}/{sequence.length})</p>
      )}

      {gameOver && (
        <p className="text-sm text-destructive font-medium">Game Over! Score: {score}</p>
      )}
    </div>
  );
};

export default SimonSaysGame;
