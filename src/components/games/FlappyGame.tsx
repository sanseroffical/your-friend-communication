import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const CANVAS_WIDTH = 280;
const CANVAS_HEIGHT = 400;
const BIRD_SIZE = 20;
const PIPE_WIDTH = 40;
const PIPE_GAP = 120;
const GRAVITY = 0.4;
const JUMP_STRENGTH = -7;

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

const FlappyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [birdY, setBirdY] = useState(CANVAS_HEIGHT / 2);
  const [velocity, setVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const jump = useCallback(() => {
    if (!isPlaying || gameOver) return;
    setVelocity(JUMP_STRENGTH);
  }, [isPlaying, gameOver]);

  const startGame = () => {
    setBirdY(CANVAS_HEIGHT / 2);
    setVelocity(0);
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = setInterval(() => {
      // Update bird
      setBirdY(prev => {
        const newY = prev + velocity;
        if (newY <= 0 || newY >= CANVAS_HEIGHT - BIRD_SIZE) {
          setGameOver(true);
          setIsPlaying(false);
          if (score > highScore) setHighScore(score);
          return prev;
        }
        return newY;
      });
      setVelocity(prev => prev + GRAVITY);

      // Update pipes
      setPipes(prev => {
        let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - 2 })).filter(pipe => pipe.x > -PIPE_WIDTH);
        
        // Add new pipe
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < CANVAS_WIDTH - 150) {
          newPipes.push({
            x: CANVAS_WIDTH,
            topHeight: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50,
            passed: false,
          });
        }

        // Check collisions and scoring
        const birdX = 50;
        for (const pipe of newPipes) {
          // Collision check
          if (
            birdX + BIRD_SIZE > pipe.x &&
            birdX < pipe.x + PIPE_WIDTH
          ) {
            if (birdY < pipe.topHeight || birdY + BIRD_SIZE > pipe.topHeight + PIPE_GAP) {
              setGameOver(true);
              setIsPlaying(false);
              if (score > highScore) setHighScore(score);
              return prev;
            }
          }

          // Score
          if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
            pipe.passed = true;
            setScore(s => s + 1);
          }
        }

        return newPipes;
      });
    }, 16);

    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, velocity, score, highScore, birdY]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Pipes
    ctx.fillStyle = '#22c55e';
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.fillRect(pipe.x - 3, pipe.topHeight - 15, PIPE_WIDTH + 6, 15);
      // Bottom pipe
      const bottomY = pipe.topHeight + PIPE_GAP;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY);
      ctx.fillRect(pipe.x - 3, bottomY, PIPE_WIDTH + 6, 15);
    });

    // Bird
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(50 + BIRD_SIZE / 2, birdY + BIRD_SIZE / 2, BIRD_SIZE / 2, BIRD_SIZE / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(45, birdY + BIRD_SIZE / 2 + 2, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(55, birdY + BIRD_SIZE / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(56, birdY + BIRD_SIZE / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(60, birdY + BIRD_SIZE / 2);
    ctx.lineTo(68, birdY + BIRD_SIZE / 2 + 2);
    ctx.lineTo(60, birdY + BIRD_SIZE / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }, [birdY, pipes]);

  // Handle input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between w-full max-w-[280px]">
        <div className="text-sm">
          <span className="text-muted-foreground">Score: </span>
          <span className="font-bold">{score}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Best: </span>
          <span className="font-bold">{highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-border rounded-lg cursor-pointer"
        onClick={jump}
      />

      {!isPlaying && (
        <Button onClick={startGame} className="w-full max-w-[200px]">
          {gameOver ? 'Play Again' : 'Start Game'}
        </Button>
      )}

      {isPlaying && !gameOver && (
        <p className="text-xs text-muted-foreground">Click or press Space to flap!</p>
      )}
    </div>
  );
};

export default FlappyGame;
