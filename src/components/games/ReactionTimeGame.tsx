import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
}

const ReactionTimeGame = () => {
  const [gameState, setGameState] = useState<"waiting" | "ready" | "click" | "result" | "tooEarly">("waiting");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startTest = useCallback(() => {
    setGameState("ready");
    setReactionTime(null);
    
    // Random delay between 1-5 seconds
    const delay = 1000 + Math.random() * 4000;
    const id = setTimeout(() => {
      setStartTime(Date.now());
      setGameState("click");
    }, delay);
    
    setTimeoutId(id);
  }, []);

  const handleClick = useCallback(() => {
    if (gameState === "ready") {
      // Clicked too early
      if (timeoutId) clearTimeout(timeoutId);
      setGameState("tooEarly");
    } else if (gameState === "click") {
      const reaction = Date.now() - startTime;
      setReactionTime(reaction);
      setAttempts(prev => [...prev.slice(-4), reaction]);
      setGameState("result");
    } else if (gameState === "result" || gameState === "tooEarly" || gameState === "waiting") {
      startTest();
    }
  }, [gameState, startTime, timeoutId, startTest]);

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const getAverageTime = () => {
    if (attempts.length === 0) return null;
    return Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length);
  };

  const getReactionRating = (time: number) => {
    if (time < 200) return { text: "Lightning Fast! ⚡", color: "text-yellow-500" };
    if (time < 250) return { text: "Excellent! 🎯", color: "text-green-500" };
    if (time < 300) return { text: "Good! 👍", color: "text-blue-500" };
    if (time < 400) return { text: "Average 😊", color: "text-muted-foreground" };
    return { text: "Keep Practicing! 💪", color: "text-orange-500" };
  };

  const average = getAverageTime();

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-bold">⚡ Reaction Time</h3>
      <p className="text-sm text-muted-foreground">Test your reflexes!</p>

      <div
        onClick={handleClick}
        className={`w-full max-w-md h-64 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
          gameState === "waiting" ? "bg-primary hover:bg-primary/90" :
          gameState === "ready" ? "bg-red-500" :
          gameState === "click" ? "bg-green-500" :
          gameState === "result" ? "bg-blue-500" :
          "bg-orange-500"
        }`}
      >
        {gameState === "waiting" && (
          <div className="text-center text-primary-foreground">
            <p className="text-2xl font-bold">Click to Start</p>
            <p className="text-sm opacity-80 mt-2">Get ready to react!</p>
          </div>
        )}
        
        {gameState === "ready" && (
          <div className="text-center text-white">
            <p className="text-3xl font-bold">Wait for green...</p>
            <p className="text-sm opacity-80 mt-2">Don't click yet!</p>
          </div>
        )}
        
        {gameState === "click" && (
          <div className="text-center text-white">
            <p className="text-4xl font-bold animate-pulse">CLICK NOW!</p>
          </div>
        )}
        
        {gameState === "tooEarly" && (
          <div className="text-center text-white">
            <p className="text-2xl font-bold">Too early! 😅</p>
            <p className="text-sm mt-2">Click to try again</p>
          </div>
        )}
        
        {gameState === "result" && reactionTime && (
          <div className="text-center text-white">
            <p className="text-5xl font-bold">{reactionTime}ms</p>
            <p className={`text-lg mt-2 ${getReactionRating(reactionTime).color}`}>
              {getReactionRating(reactionTime).text}
            </p>
            <p className="text-sm mt-4 opacity-80">Click to try again</p>
          </div>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="text-center space-y-2">
          <div className="flex gap-2 flex-wrap justify-center">
            {attempts.map((time, i) => (
              <span key={i} className="px-2 py-1 bg-muted rounded text-sm">
                {time}ms
              </span>
            ))}
          </div>
          {average && (
            <p className="text-sm">
              Average: <span className="font-bold text-primary">{average}ms</span>
              <span className="text-muted-foreground ml-2">({attempts.length} attempts)</span>
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground text-center max-w-xs">
        <p>Human average: 250-300ms</p>
        <p>Professional gamers: 150-200ms</p>
      </div>
    </div>
  );
};

export default ReactionTimeGame;
