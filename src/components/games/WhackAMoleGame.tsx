import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameScores } from '@/hooks/useGameScores';

interface Mole {
  id: number;
  isUp: boolean;
  isGolden: boolean;
  isBomb: boolean;
}

const WhackAMoleGame = () => {
  const { submitScore } = useGameScores('whack-a-mole');
  const [moles, setMoles] = useState<Mole[]>(
    Array(9).fill(null).map((_, i) => ({ id: i, isUp: false, isGolden: false, isBomb: false }))
  );
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [level, setLevel] = useState(1);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setMoles(Array(9).fill(null).map((_, i) => ({ id: i, isUp: false, isGolden: false, isBomb: false })));
    setScore(0);
    setTimeLeft(30);
    setLevel(1);
    setHits(0);
    setMisses(0);
    setGameActive(true);
  };

  const popUpMole = useCallback(() => {
    setMoles(prev => {
      const newMoles = [...prev];
      
      newMoles.forEach((mole, i) => {
        if (mole.isUp && Math.random() < 0.3) {
          newMoles[i] = { ...mole, isUp: false, isGolden: false, isBomb: false };
        }
      });
      
      const numToPopUp = Math.min(1 + Math.floor(level / 3), 3);
      const availableHoles = newMoles
        .map((m, i) => (!m.isUp ? i : -1))
        .filter(i => i !== -1);
      
      for (let i = 0; i < numToPopUp && availableHoles.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableHoles.length);
        const holeIndex = availableHoles.splice(randomIndex, 1)[0];
        
        const rand = Math.random();
        newMoles[holeIndex] = {
          ...newMoles[holeIndex],
          isUp: true,
          isGolden: rand < 0.1,
          isBomb: rand >= 0.1 && rand < 0.15,
        };
      }
      
      return newMoles;
    });
  }, [level]);

  useEffect(() => {
    if (!gameActive) return;

    const speed = Math.max(800 - level * 50, 400);
    gameLoopRef.current = setInterval(popUpMole, speed);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameActive, level, popUpMole]);

  useEffect(() => {
    if (!gameActive || timeLeft <= 0) {
      if (gameActive && timeLeft <= 0) {
        setGameActive(false);
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        submitScore(score);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, timeLeft, score, submitScore]);

  useEffect(() => {
    if (hits > 0 && hits % 10 === 0) {
      setLevel(l => l + 1);
    }
  }, [hits]);

  const whackMole = (index: number) => {
    if (!gameActive) return;
    
    const mole = moles[index];
    if (!mole.isUp) return;
    
    if (mole.isBomb) {
      setScore(s => Math.max(s - 50, 0));
      setMisses(m => m + 1);
    } else {
      const points = mole.isGolden ? 25 : 10;
      setScore(s => s + points);
      setHits(h => h + 1);
    }
    
    setMoles(prev => {
      const newMoles = [...prev];
      newMoles[index] = { ...mole, isUp: false, isGolden: false, isBomb: false };
      return newMoles;
    });
  };

  if (!gameActive && timeLeft <= 0) {
    const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
    
    return (
      <div className="p-4 space-y-4 text-center">
        <h3 className="text-lg font-bold">🔨 Game Over!</h3>
        <div className="bg-primary/10 p-4 rounded-lg space-y-2">
          <p className="text-3xl font-bold text-primary">{score} points</p>
          <div className="flex justify-center gap-4 text-sm">
            <span>🎯 Hits: {hits}</span>
            <span>❌ Misses: {misses}</span>
            <span>📊 {accuracy}%</span>
          </div>
          <p className="text-muted-foreground">Level reached: {level}</p>
        </div>
        <Button onClick={startGame} className="w-full">Play Again</Button>
      </div>
    );
  }

  if (!gameActive) {
    return (
      <div className="p-4 space-y-4 text-center">
        <h3 className="text-lg font-bold">🔨 Whack-a-Mole</h3>
        <p className="text-muted-foreground">
          Whack the moles as they pop up! Golden moles = 25 pts. Avoid bombs! 💣
        </p>
        <Button onClick={startGame} className="w-full">Start Game</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">🔨 Whack-a-Mole</h3>
        <div className="flex gap-2">
          <Badge variant="outline">Level {level}</Badge>
          <Badge variant="secondary">{score} pts</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Time: {timeLeft}s</span>
          <span>🎯 {hits} hits</span>
        </div>
        <Progress value={(timeLeft / 30) * 100} />
      </div>

      <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
        {moles.map((mole, index) => (
          <button
            key={mole.id}
            onClick={() => whackMole(index)}
            className={`
              aspect-square rounded-full transition-all duration-100 relative overflow-hidden
              ${mole.isUp ? 'scale-110' : 'scale-100'}
              bg-muted border-4 border-border
            `}
          >
            <div className={`
              absolute inset-0 flex items-center justify-center text-3xl
              transition-transform duration-100
              ${mole.isUp ? 'translate-y-0' : 'translate-y-full'}
            `}>
              {mole.isBomb ? '💣' : mole.isGolden ? '🌟' : '🐹'}
            </div>
            {!mole.isUp && (
              <div className="absolute inset-2 rounded-full bg-background/50" />
            )}
          </button>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>🐹 Normal = 10 pts | 🌟 Golden = 25 pts | 💣 Bomb = -50 pts</p>
      </div>
    </div>
  );
};

export default WhackAMoleGame;
