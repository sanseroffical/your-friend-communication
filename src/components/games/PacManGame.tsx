import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

type Direction = 'up' | 'down' | 'left' | 'right';
type CellType = 'empty' | 'wall' | 'dot' | 'power' | 'pacman' | 'ghost';

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  pos: Position;
  direction: Direction;
  scared: boolean;
}

const GRID_SIZE = 15;
const CELL_SIZE = 24;

// Simple maze layout (1 = wall, 0 = path)
const createMaze = (): number[][] => {
  const maze = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
  
  // Border walls
  for (let i = 0; i < GRID_SIZE; i++) {
    maze[0][i] = 1;
    maze[GRID_SIZE - 1][i] = 1;
    maze[i][0] = 1;
    maze[i][GRID_SIZE - 1] = 1;
  }
  
  // Internal walls
  for (let i = 2; i < 5; i++) {
    maze[2][i] = 1;
    maze[i][6] = 1;
    maze[6][i + 4] = 1;
  }
  for (let i = 10; i < 13; i++) {
    maze[2][i] = 1;
    maze[12][i - 4] = 1;
  }
  for (let i = 4; i < 11; i++) {
    maze[4][i] = 1;
    maze[10][i] = 1;
  }
  maze[4][7] = 0;
  maze[10][7] = 0;
  
  for (let i = 5; i < 10; i++) {
    maze[i][2] = 1;
    maze[i][12] = 1;
  }
  maze[7][2] = 0;
  maze[7][12] = 0;
  
  // Ghost house
  for (let i = 6; i < 9; i++) {
    maze[6][i] = 1;
    maze[8][i] = 1;
  }
  maze[6][7] = 0;
  maze[8][7] = 0;
  
  return maze;
};

const PacManGame = () => {
  const [maze] = useState(createMaze);
  const [pacman, setPacman] = useState<Position>({ x: 1, y: 1 });
  const [direction, setDirection] = useState<Direction>('right');
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { pos: { x: 7, y: 7 }, direction: 'up', scared: false },
    { pos: { x: 13, y: 1 }, direction: 'left', scared: false },
    { pos: { x: 1, y: 13 }, direction: 'right', scared: false },
  ]);
  const [dots, setDots] = useState<Set<string>>(new Set());
  const [powerPellets, setPowerPellets] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [powerMode, setPowerMode] = useState(false);
  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize dots
  useEffect(() => {
    const newDots = new Set<string>();
    const newPower = new Set<string>();
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
          const key = `${x},${y}`;
          // Power pellets in corners
          if ((x === 1 && y === 13) || (x === 13 && y === 1) || 
              (x === 1 && y === 1) || (x === 13 && y === 13)) {
            newPower.add(key);
          } else {
            newDots.add(key);
          }
        }
      }
    }
    
    setDots(newDots);
    setPowerPellets(newPower);
  }, [maze]);

  const canMove = useCallback((pos: Position, dir: Direction): boolean => {
    let newX = pos.x;
    let newY = pos.y;
    
    switch (dir) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return false;
    return maze[newY][newX] === 0;
  }, [maze]);

  const moveGhost = useCallback((ghost: Ghost): Ghost => {
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    
    // Try current direction first
    if (canMove(ghost.pos, ghost.direction) && Math.random() > 0.3) {
      let newPos = { ...ghost.pos };
      switch (ghost.direction) {
        case 'up': newPos.y--; break;
        case 'down': newPos.y++; break;
        case 'left': newPos.x--; break;
        case 'right': newPos.x++; break;
      }
      return { ...ghost, pos: newPos };
    }
    
    // Otherwise pick a new direction
    const validDirs = directions.filter(d => 
      d !== opposite[ghost.direction] && canMove(ghost.pos, d)
    );
    
    if (validDirs.length > 0) {
      const newDir = validDirs[Math.floor(Math.random() * validDirs.length)];
      let newPos = { ...ghost.pos };
      switch (newDir) {
        case 'up': newPos.y--; break;
        case 'down': newPos.y++; break;
        case 'left': newPos.x--; break;
        case 'right': newPos.x++; break;
      }
      return { ...ghost, pos: newPos, direction: newDir };
    }
    
    return ghost;
  }, [canMove]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isPaused) return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          setDirection('up');
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          setDirection('down');
          break;
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          setDirection('left');
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          setDirection('right');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isPaused]);

  // Game loop
  useEffect(() => {
    if (gameOver || isPaused) return;
    
    const interval = setInterval(() => {
      // Move Pac-Man
      setPacman(prev => {
        if (!canMove(prev, direction)) return prev;
        
        let newPos = { ...prev };
        switch (direction) {
          case 'up': newPos.y--; break;
          case 'down': newPos.y++; break;
          case 'left': newPos.x--; break;
          case 'right': newPos.x++; break;
        }
        
        const key = `${newPos.x},${newPos.y}`;
        
        // Eat dot
        if (dots.has(key)) {
          setDots(d => {
            const newDots = new Set(d);
            newDots.delete(key);
            return newDots;
          });
          setScore(s => s + 10);
        }
        
        // Eat power pellet
        if (powerPellets.has(key)) {
          setPowerPellets(p => {
            const newPower = new Set(p);
            newPower.delete(key);
            return newPower;
          });
          setScore(s => s + 50);
          setPowerMode(true);
          setGhosts(g => g.map(ghost => ({ ...ghost, scared: true })));
          
          if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
          powerTimerRef.current = setTimeout(() => {
            setPowerMode(false);
            setGhosts(g => g.map(ghost => ({ ...ghost, scared: false })));
          }, 5000);
        }
        
        return newPos;
      });
      
      // Move ghosts
      setGhosts(prev => prev.map(moveGhost));
    }, 200);
    
    return () => clearInterval(interval);
  }, [direction, canMove, moveGhost, dots, powerPellets, gameOver, isPaused]);

  // Check collisions
  useEffect(() => {
    ghosts.forEach((ghost, index) => {
      if (ghost.pos.x === pacman.x && ghost.pos.y === pacman.y) {
        if (powerMode && ghost.scared) {
          // Eat ghost
          setScore(s => s + 200);
          setGhosts(g => {
            const newGhosts = [...g];
            newGhosts[index] = { ...ghost, pos: { x: 7, y: 7 }, scared: false };
            return newGhosts;
          });
        } else {
          // Lose life
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameOver(true);
            }
            return newLives;
          });
          setPacman({ x: 1, y: 1 });
        }
      }
    });
  }, [pacman, ghosts, powerMode]);

  // Check win condition
  useEffect(() => {
    if (dots.size === 0 && powerPellets.size === 0 && !gameOver) {
      setGameOver(true);
    }
  }, [dots, powerPellets, gameOver]);

  const resetGame = () => {
    setPacman({ x: 1, y: 1 });
    setDirection('right');
    setGhosts([
      { pos: { x: 7, y: 7 }, direction: 'up', scared: false },
      { pos: { x: 13, y: 1 }, direction: 'left', scared: false },
      { pos: { x: 1, y: 13 }, direction: 'right', scared: false },
    ]);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setPowerMode(false);
    
    // Reset dots
    const newDots = new Set<string>();
    const newPower = new Set<string>();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
          const key = `${x},${y}`;
          if ((x === 1 && y === 13) || (x === 13 && y === 1) || 
              (x === 1 && y === 1) || (x === 13 && y === 13)) {
            newPower.add(key);
          } else {
            newDots.add(key);
          }
        }
      }
    }
    setDots(newDots);
    setPowerPellets(newPower);
  };

  const getCellColor = (x: number, y: number): string => {
    if (maze[y][x] === 1) return 'bg-blue-900';
    return 'bg-background';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-lg font-bold">Score: {score}</div>
        <div className="flex gap-1">
          {Array.from({ length: lives }).map((_, i) => (
            <span key={i} className="text-yellow-400">🟡</span>
          ))}
        </div>
      </div>

      <div 
        className="relative border-2 border-blue-500 rounded"
        style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
      >
        {/* Grid */}
        {Array.from({ length: GRID_SIZE }).map((_, y) => (
          <div key={y} className="flex">
            {Array.from({ length: GRID_SIZE }).map((_, x) => (
              <div
                key={`${x}-${y}`}
                className={`${getCellColor(x, y)}`}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
              />
            ))}
          </div>
        ))}

        {/* Dots */}
        {Array.from(dots).map(key => {
          const [x, y] = key.split(',').map(Number);
          return (
            <div
              key={key}
              className="absolute w-2 h-2 bg-yellow-200 rounded-full"
              style={{
                left: x * CELL_SIZE + CELL_SIZE / 2 - 4,
                top: y * CELL_SIZE + CELL_SIZE / 2 - 4,
              }}
            />
          );
        })}

        {/* Power Pellets */}
        {Array.from(powerPellets).map(key => {
          const [x, y] = key.split(',').map(Number);
          return (
            <div
              key={key}
              className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-pulse"
              style={{
                left: x * CELL_SIZE + CELL_SIZE / 2 - 8,
                top: y * CELL_SIZE + CELL_SIZE / 2 - 8,
              }}
            />
          );
        })}

        {/* Pac-Man */}
        <div
          className="absolute text-2xl transition-all duration-100"
          style={{
            left: pacman.x * CELL_SIZE,
            top: pacman.y * CELL_SIZE,
            transform: `rotate(${
              direction === 'up' ? -90 : 
              direction === 'down' ? 90 : 
              direction === 'left' ? 180 : 0
            }deg)`,
          }}
        >
          🟡
        </div>

        {/* Ghosts */}
        {ghosts.map((ghost, i) => (
          <div
            key={i}
            className="absolute text-xl transition-all duration-200"
            style={{
              left: ghost.pos.x * CELL_SIZE,
              top: ghost.pos.y * CELL_SIZE,
            }}
          >
            {ghost.scared ? '👻' : ['🔴', '🟣', '🟠'][i]}
          </div>
        ))}

        {/* Game Over / Win overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold mb-2">
              {dots.size === 0 && powerPellets.size === 0 ? '🎉 You Win!' : '💀 Game Over'}
            </p>
            <p className="text-lg mb-4">Final Score: {score}</p>
            <Button onClick={resetGame}>Play Again</Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </Button>
        <Button variant="outline" size="sm" onClick={resetGame}>
          🔄 Reset
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Arrow keys or WASD to move • Eat all dots to win!
      </p>
    </div>
  );
};

export default PacManGame;

