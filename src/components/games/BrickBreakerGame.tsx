import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 350;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 34;
const BRICK_HEIGHT = 15;
const BRICK_GAP = 2;

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

const BrickBreakerGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paddleX, setPaddleX] = useState(CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [ball, setBall] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: 3, vy: -3 });
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const initBricks = useCallback(() => {
    const newBricks: Brick[] = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: col * (BRICK_WIDTH + BRICK_GAP) + 10,
          y: row * (BRICK_HEIGHT + BRICK_GAP) + 30,
          alive: true,
          color: COLORS[row],
        });
      }
    }
    return newBricks;
  }, []);

  const startGame = () => {
    setBricks(initBricks());
    setPaddleX(CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2);
    setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: 3, vy: -3 });
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setIsPlaying(true);
  };

  const resetBall = () => {
    setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, vx: 3 * (Math.random() > 0.5 ? 1 : -1), vy: -3 });
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver || won) return;

    const gameLoop = setInterval(() => {
      setBall(prev => {
        let newX = prev.x + prev.vx;
        let newY = prev.y + prev.vy;
        let newVx = prev.vx;
        let newVy = prev.vy;

        // Wall collisions
        if (newX <= 0 || newX >= CANVAS_WIDTH - BALL_SIZE) {
          newVx = -newVx;
          newX = Math.max(0, Math.min(CANVAS_WIDTH - BALL_SIZE, newX));
        }
        if (newY <= 0) {
          newVy = -newVy;
          newY = 0;
        }

        // Paddle collision
        if (
          newY + BALL_SIZE >= CANVAS_HEIGHT - PADDLE_HEIGHT - 10 &&
          newY <= CANVAS_HEIGHT - 10 &&
          newX + BALL_SIZE >= paddleX &&
          newX <= paddleX + PADDLE_WIDTH
        ) {
          newVy = -Math.abs(newVy);
          const hitPos = (newX + BALL_SIZE / 2 - paddleX) / PADDLE_WIDTH;
          newVx = (hitPos - 0.5) * 8;
          newY = CANVAS_HEIGHT - PADDLE_HEIGHT - 10 - BALL_SIZE;
        }

        // Ball out
        if (newY > CANVAS_HEIGHT) {
          setLives(l => {
            if (l - 1 <= 0) {
              setGameOver(true);
              setIsPlaying(false);
            } else {
              resetBall();
            }
            return l - 1;
          });
          return prev;
        }

        // Brick collisions
        setBricks(prevBricks => {
          let updated = false;
          const newBricks = prevBricks.map(brick => {
            if (!brick.alive) return brick;
            if (
              newX + BALL_SIZE > brick.x &&
              newX < brick.x + BRICK_WIDTH &&
              newY + BALL_SIZE > brick.y &&
              newY < brick.y + BRICK_HEIGHT
            ) {
              updated = true;
              newVy = -newVy;
              setScore(s => s + 10);
              return { ...brick, alive: false };
            }
            return brick;
          });
          
          if (newBricks.every(b => !b.alive)) {
            setWon(true);
            setIsPlaying(false);
          }
          
          return updated ? newBricks : prevBricks;
        });

        return { x: newX, y: newY, vx: newVx, vy: newVy };
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, won, paddleX]);

  // Mouse/touch controls
  const handleMove = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - PADDLE_WIDTH / 2;
    setPaddleX(Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x)));
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Bricks
    bricks.forEach(brick => {
      if (!brick.alive) return;
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
    });

    // Paddle
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.roundRect(paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - 10, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
    ctx.fill();

    // Ball
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [ball, paddleX, bricks]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between w-full max-w-[300px]">
        <div className="text-sm">
          <span className="text-muted-foreground">Score: </span>
          <span className="font-bold">{score}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Lives: </span>
          <span className="font-bold text-red-400">{'❤️'.repeat(Math.max(0, lives))}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-border rounded-lg cursor-none"
        onMouseMove={(e) => isPlaying && handleMove(e.clientX)}
        onTouchMove={(e) => isPlaying && handleMove(e.touches[0].clientX)}
      />

      {!isPlaying && (
        <Button onClick={startGame} className="w-full max-w-[200px]">
          {gameOver ? 'Game Over! Play Again' : won ? 'You Win! Play Again' : 'Start Game'}
        </Button>
      )}

      {isPlaying && (
        <p className="text-xs text-muted-foreground">Move mouse/touch to control paddle</p>
      )}
    </div>
  );
};

export default BrickBreakerGame;
