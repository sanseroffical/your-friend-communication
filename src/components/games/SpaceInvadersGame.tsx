import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface Invader {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  isPlayer: boolean;
}

const SpaceInvadersGame = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [playerX, setPlayerX] = useState(150);
  const [invaders, setInvaders] = useState<Invader[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [direction, setDirection] = useState(1);
  const gameRef = useRef<HTMLDivElement>(null);

  const initGame = () => {
    const newInvaders: Invader[] = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        newInvaders.push({ x: col * 35 + 20, y: row * 30 + 20, alive: true });
      }
    }
    setInvaders(newInvaders);
    setBullets([]);
    setPlayerX(150);
    setScore(0);
    setGameOver(false);
    setDirection(1);
    setGameStarted(true);
  };

  const shoot = useCallback(() => {
    if (!gameStarted || gameOver) return;
    setBullets(prev => [...prev, { x: playerX + 12, y: 250, isPlayer: true }]);
  }, [gameStarted, gameOver, playerX]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setPlayerX(prev => Math.max(0, prev - 15));
      } else if (e.key === 'ArrowRight') {
        setPlayerX(prev => Math.min(280, prev + 15));
      } else if (e.key === ' ') {
        shoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, shoot]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      // Move bullets
      setBullets(prev => {
        const newBullets = prev
          .map(b => ({ ...b, y: b.isPlayer ? b.y - 8 : b.y + 5 }))
          .filter(b => b.y > 0 && b.y < 280);
        return newBullets;
      });

      // Move invaders
      setInvaders(prev => {
        const aliveInvaders = prev.filter(i => i.alive);
        if (aliveInvaders.length === 0) {
          setGameOver(true);
          return prev;
        }

        const rightMost = Math.max(...aliveInvaders.map(i => i.x));
        const leftMost = Math.min(...aliveInvaders.map(i => i.x));
        
        let newDirection = direction;
        let moveDown = false;
        
        if (rightMost >= 280 && direction === 1) {
          newDirection = -1;
          moveDown = true;
        } else if (leftMost <= 10 && direction === -1) {
          newDirection = 1;
          moveDown = true;
        }
        
        setDirection(newDirection);
        
        return prev.map(inv => ({
          ...inv,
          x: inv.x + newDirection * 2,
          y: moveDown ? inv.y + 15 : inv.y,
        }));
      });

      // Check collisions
      setBullets(prev => {
        const remaining: Bullet[] = [];
        for (const bullet of prev) {
          let hit = false;
          if (bullet.isPlayer) {
            setInvaders(invs => {
              return invs.map(inv => {
                if (inv.alive && 
                    bullet.x >= inv.x && bullet.x <= inv.x + 25 &&
                    bullet.y >= inv.y && bullet.y <= inv.y + 20) {
                  hit = true;
                  setScore(s => s + 10);
                  return { ...inv, alive: false };
                }
                return inv;
              });
            });
          } else {
            // Enemy bullet hitting player
            if (bullet.x >= playerX && bullet.x <= playerX + 30 && bullet.y >= 250) {
              setGameOver(true);
              hit = true;
            }
          }
          if (!hit) remaining.push(bullet);
        }
        return remaining;
      });

      // Invaders shooting
      if (Math.random() < 0.02) {
        setInvaders(invs => {
          const alive = invs.filter(i => i.alive);
          if (alive.length > 0) {
            const shooter = alive[Math.floor(Math.random() * alive.length)];
            setBullets(b => [...b, { x: shooter.x + 12, y: shooter.y + 20, isPlayer: false }]);
          }
          return invs;
        });
      }

      // Check if invaders reached bottom
      setInvaders(invs => {
        if (invs.some(i => i.alive && i.y >= 230)) {
          setGameOver(true);
        }
        return invs;
      });

    }, 50);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, direction, playerX]);

  // Check win condition
  useEffect(() => {
    if (invaders.length > 0 && invaders.every(i => !i.alive)) {
      setGameOver(true);
    }
  }, [invaders]);

  if (!gameStarted) {
    return (
      <div className="text-center p-4">
        <h3 className="text-lg font-bold mb-4">👾 Space Invaders</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Arrow keys to move, Space to shoot!
        </p>
        <Button onClick={initGame}>Start Game</Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono">Score: {score}</span>
        {gameOver && <Button size="sm" onClick={initGame}>Play Again</Button>}
      </div>

      <div 
        ref={gameRef}
        className="relative bg-black border border-border rounded overflow-hidden mx-auto"
        style={{ width: 320, height: 280 }}
        tabIndex={0}
      >
        {/* Invaders */}
        {invaders.filter(i => i.alive).map((inv, idx) => (
          <div
            key={idx}
            className="absolute text-xl"
            style={{ left: inv.x, top: inv.y }}
          >
            👾
          </div>
        ))}

        {/* Bullets */}
        {bullets.map((b, idx) => (
          <div
            key={idx}
            className={`absolute w-1 h-3 ${b.isPlayer ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ left: b.x, top: b.y }}
          />
        ))}

        {/* Player */}
        <div
          className="absolute text-2xl"
          style={{ left: playerX, top: 250 }}
        >
          🚀
        </div>

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-xl font-bold mb-2">
                {invaders.every(i => !i.alive) ? '🎉 You Win!' : '💥 Game Over'}
              </p>
              <p>Score: {score}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 mt-4 md:hidden">
        <Button size="sm" onClick={() => setPlayerX(p => Math.max(0, p - 15))}>←</Button>
        <Button size="sm" onClick={shoot}>🔫</Button>
        <Button size="sm" onClick={() => setPlayerX(p => Math.min(280, p + 15))}>→</Button>
      </div>
    </div>
  );
};

export default SpaceInvadersGame;
