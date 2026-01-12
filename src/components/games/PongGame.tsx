import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 200;
const PADDLE_HEIGHT = 40;
const PADDLE_WIDTH = 8;
const BALL_SIZE = 8;

const PongGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [aiY, setAiY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ball, setBall] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 3, vy: 2 });
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const resetBall = useCallback(() => {
    setBall({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3,
      vy: (Math.random() - 0.5) * 4,
    });
  }, []);

  const startGame = () => {
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setIsPlaying(true);
    resetBall();
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = setInterval(() => {
      setBall(prev => {
        let newX = prev.x + prev.vx;
        let newY = prev.y + prev.vy;
        let newVx = prev.vx;
        let newVy = prev.vy;

        // Top/bottom collision
        if (newY <= 0 || newY >= CANVAS_HEIGHT - BALL_SIZE) {
          newVy = -newVy;
          newY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, newY));
        }

        // Player paddle collision
        if (newX <= PADDLE_WIDTH + 10 && newY + BALL_SIZE >= playerY && newY <= playerY + PADDLE_HEIGHT) {
          newVx = Math.abs(newVx) * 1.05;
          newX = PADDLE_WIDTH + 10;
          const hitPos = (newY + BALL_SIZE / 2 - playerY) / PADDLE_HEIGHT;
          newVy = (hitPos - 0.5) * 6;
        }

        // AI paddle collision
        if (newX >= CANVAS_WIDTH - PADDLE_WIDTH - 10 - BALL_SIZE && newY + BALL_SIZE >= aiY && newY <= aiY + PADDLE_HEIGHT) {
          newVx = -Math.abs(newVx) * 1.05;
          newX = CANVAS_WIDTH - PADDLE_WIDTH - 10 - BALL_SIZE;
          const hitPos = (newY + BALL_SIZE / 2 - aiY) / PADDLE_HEIGHT;
          newVy = (hitPos - 0.5) * 6;
        }

        // Scoring
        if (newX <= 0) {
          setAiScore(s => {
            if (s + 1 >= 5) setGameOver(true);
            return s + 1;
          });
          return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: 3, vy: (Math.random() - 0.5) * 4 };
        }
        if (newX >= CANVAS_WIDTH) {
          setPlayerScore(s => {
            if (s + 1 >= 5) setGameOver(true);
            return s + 1;
          });
          return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: -3, vy: (Math.random() - 0.5) * 4 };
        }

        return { x: newX, y: newY, vx: newVx, vy: newVy };
      });

      // AI movement
      setAiY(prev => {
        const targetY = ball.y - PADDLE_HEIGHT / 2;
        const diff = targetY - prev;
        return prev + Math.sign(diff) * Math.min(Math.abs(diff), 3);
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, ball.y, playerY]);

  // Mouse/touch controls
  const handleMove = useCallback((clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = clientY - rect.top - PADDLE_HEIGHT / 2;
    setPlayerY(Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, y)));
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(10, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = '#f87171';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH - 10, aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Ball
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [ball, playerY, aiY]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between w-full max-w-[300px]">
        <div className="text-sm">
          <span className="text-blue-400 font-bold">You: {playerScore}</span>
        </div>
        <div className="text-sm">
          <span className="text-red-400 font-bold">AI: {aiScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-border rounded-lg cursor-none"
        onMouseMove={(e) => isPlaying && handleMove(e.clientY)}
        onTouchMove={(e) => isPlaying && handleMove(e.touches[0].clientY)}
      />

      {!isPlaying && (
        <Button onClick={startGame} className="w-full max-w-[200px]">
          {gameOver ? (playerScore >= 5 ? 'You Win! Play Again' : 'You Lose! Play Again') : 'Start Game'}
        </Button>
      )}

      {isPlaying && !gameOver && (
        <p className="text-xs text-muted-foreground">Move mouse/touch to control paddle. First to 5 wins!</p>
      )}
    </div>
  );
};

export default PongGame;
