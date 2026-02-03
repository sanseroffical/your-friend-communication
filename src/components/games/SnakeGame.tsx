import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import GameLeaderboard from "./GameLeaderboard";
import { useGameScores } from "@/hooks/useGameScores";

const GRID_SIZE = 15;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

const SnakeGame = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const directionRef = useRef(direction);
  const { submitScore } = useGameScores("snake");
  const scoreSubmittedRef = useRef(false);

  const generateFood = useCallback((currentSnake: Position[]) => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = () => {
    const initialSnake = [{ x: 7, y: 7 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setIsPlaying(true);
    scoreSubmittedRef.current = false;
  };

  // Submit score when game ends
  useEffect(() => {
    if (gameOver && score > 0 && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      submitScore(score);
    }
  }, [gameOver, score, submitScore]);

  const moveSnake = useCallback(() => {
    if (!isPlaying || gameOver) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const dir = directionRef.current;
      let newHead: Position;

      switch (dir) {
        case "UP":
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case "DOWN":
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case "LEFT":
          newHead = { x: head.x - 1, y: head.y };
          break;
        case "RIGHT":
          newHead = { x: head.x + 1, y: head.y };
          break;
        default:
          newHead = head;
      }

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(prev => prev + 10);
        setFood(generateFood(newSnake));
        return newSnake;
      }

      newSnake.pop();
      return newSnake;
    });
  }, [isPlaying, gameOver, food, generateFood]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;

      const currentDir = directionRef.current;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
          if (currentDir !== "DOWN") {
            setDirection("UP");
            directionRef.current = "UP";
          }
          break;
        case "ArrowDown":
        case "s":
          if (currentDir !== "UP") {
            setDirection("DOWN");
            directionRef.current = "DOWN";
          }
          break;
        case "ArrowLeft":
        case "a":
          if (currentDir !== "RIGHT") {
            setDirection("LEFT");
            directionRef.current = "LEFT";
          }
          break;
        case "ArrowRight":
        case "d":
          if (currentDir !== "LEFT") {
            setDirection("RIGHT");
            directionRef.current = "RIGHT";
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(gameLoop);
  }, [isPlaying, moveSnake]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full">
        <span className="text-sm font-medium">Score: {score}</span>
        {!isPlaying && !gameOver && (
          <Button size="sm" onClick={resetGame}>Start</Button>
        )}
        {gameOver && (
          <Button size="sm" onClick={resetGame}>Play Again</Button>
        )}
      </div>

      <div 
        className="border-2 border-border rounded relative bg-muted/30"
        style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
      >
        {/* Snake */}
        {snake.map((segment, i) => (
          <div
            key={i}
            className="absolute rounded-sm bg-green-500"
            style={{
              width: CELL_SIZE - 2,
              height: CELL_SIZE - 2,
              left: segment.x * CELL_SIZE + 1,
              top: segment.y * CELL_SIZE + 1,
              opacity: 1 - (i * 0.05),
            }}
          />
        ))}

        {/* Food */}
        <div
          className="absolute rounded-full bg-red-500"
          style={{
            width: CELL_SIZE - 4,
            height: CELL_SIZE - 4,
            left: food.x * CELL_SIZE + 2,
            top: food.y * CELL_SIZE + 2,
          }}
        />

        {/* Game over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-bold text-destructive">Game Over!</p>
              <p className="text-sm text-muted-foreground">Score: {score}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Use arrow keys or WASD to move
      </p>

      <GameLeaderboard gameType="snake" gameName="Snake" />
    </div>
  );
};

export default SnakeGame;
