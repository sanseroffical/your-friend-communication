import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const GAME_DURATION = 10; // seconds

const ClickerGame = () => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("clickerHighScore");
    return saved ? parseInt(saved) : 0;
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setClicks(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
  };

  const handleClick = () => {
    if (!isPlaying) return;
    setClicks(prev => prev + 1);
  };

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      if (clicks > highScore) {
        setHighScore(clicks);
        localStorage.setItem("clickerHighScore", clicks.toString());
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, timeLeft, clicks, highScore]);

  const cps = isPlaying && GAME_DURATION - timeLeft > 0 
    ? (clicks / (GAME_DURATION - timeLeft)).toFixed(1) 
    : "0.0";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex justify-between w-full text-sm">
        <span>High Score: {highScore}</span>
        <span>CPS: {cps}</span>
      </div>

      <div className="w-full">
        <div className="flex justify-between text-sm mb-1">
          <span>Time Left</span>
          <span>{timeLeft}s</span>
        </div>
        <Progress value={(timeLeft / GAME_DURATION) * 100} />
      </div>

      <div className="text-center">
        <p className="text-5xl font-bold">{clicks}</p>
        <p className="text-sm text-muted-foreground">clicks</p>
      </div>

      {isPlaying ? (
        <Button 
          size="lg" 
          className="w-32 h-32 rounded-full text-xl active:scale-95 transition-transform"
          onClick={handleClick}
        >
          CLICK!
        </Button>
      ) : (
        <div className="text-center space-y-4">
          {timeLeft === 0 && (
            <div>
              <p className="text-lg font-medium">
                {clicks > highScore ? "New High Score! 🎉" : "Time's up!"}
              </p>
              <p className="text-muted-foreground">
                You clicked {clicks} times ({((clicks / GAME_DURATION)).toFixed(1)} CPS)
              </p>
            </div>
          )}
          <Button size="lg" onClick={startGame}>
            {timeLeft === GAME_DURATION ? "Start Game" : "Play Again"}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Click as fast as you can in {GAME_DURATION} seconds!
      </p>
    </div>
  );
};

export default ClickerGame;
