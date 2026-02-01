import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

const COLORS = [
  { name: "RED", color: "bg-red-500" },
  { name: "BLUE", color: "bg-blue-500" },
  { name: "GREEN", color: "bg-green-500" },
  { name: "YELLOW", color: "bg-yellow-500" },
  { name: "PURPLE", color: "bg-purple-500" },
  { name: "ORANGE", color: "bg-orange-500" },
];

interface Challenge {
  text: string;
  displayColor: string;
  actualColor: string;
}

const ColorMatchGame = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateChallenge = useCallback((): Challenge => {
    const textColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const displayColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      text: textColor.name,
      displayColor: displayColor.color,
      actualColor: textColor.color,
    };
  }, []);

  const startNewRound = useCallback(() => {
    setChallenge(generateChallenge());
    setTimeLeft(Math.max(1.5, 3 - score * 0.05)); // Gets faster as score increases
  }, [generateChallenge, score]);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setGameOver(false);
    setGameStarted(true);
    setStreak(0);
    startNewRound();
  }, [startNewRound]);

  useEffect(() => {
    if (!gameStarted || gameOver || !challenge) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          // Time's up - lose a life
          setLives(l => {
            if (l <= 1) {
              setGameOver(true);
              setGameStarted(false);
              if (score > highScore) setHighScore(score);
              return 0;
            }
            return l - 1;
          });
          setStreak(0);
          startNewRound();
          return 3;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver, challenge, startNewRound, score, highScore]);

  const handleAnswer = (matchesText: boolean) => {
    if (!challenge || gameOver) return;

    const isCorrect = matchesText
      ? challenge.displayColor === challenge.actualColor
      : challenge.displayColor !== challenge.actualColor;

    if (isCorrect) {
      const bonus = streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
      setScore(s => s + bonus);
      setStreak(s => s + 1);
    } else {
      setLives(l => {
        if (l <= 1) {
          setGameOver(true);
          setGameStarted(false);
          if (score > highScore) setHighScore(score);
          return 0;
        }
        return l - 1;
      });
      setStreak(0);
    }

    startNewRound();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        handleAnswer(true);
      } else if (e.key === "ArrowRight" || e.key === "d") {
        handleAnswer(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, gameOver, challenge]);

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <h3 className="text-lg font-bold">🎨 Color Match</h3>
      <p className="text-sm text-muted-foreground text-center">
        Does the text color match what it says?
      </p>

      <div className="flex gap-8 text-sm">
        <div>Score: <span className="font-bold">{score}</span></div>
        <div>Best: <span className="font-bold">{highScore}</span></div>
        <div>Lives: <span className="font-bold text-red-500">{"❤️".repeat(lives)}</span></div>
      </div>

      {streak >= 3 && gameStarted && (
        <div className="text-orange-500 font-bold animate-pulse">
          🔥 {streak} Streak! (+{streak >= 5 ? 3 : 2} bonus)
        </div>
      )}

      {!gameStarted ? (
        <div className="text-center space-y-4">
          {gameOver && (
            <div className="space-y-2">
              <p className="text-xl font-bold text-destructive">Game Over!</p>
              <p>Final Score: {score}</p>
              {score === highScore && score > 0 && (
                <p className="text-yellow-500 font-bold">🏆 New High Score!</p>
              )}
            </div>
          )}
          <Button onClick={startGame} size="lg">
            {gameOver ? "Play Again" : "Start Game"}
          </Button>
          <div className="text-xs text-muted-foreground">
            Use Arrow Keys or click buttons to answer
          </div>
        </div>
      ) : (
        <>
          {/* Timer bar */}
          <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${timeLeft < 1 ? "bg-red-500" : "bg-primary"}`}
              style={{ width: `${(timeLeft / 3) * 100}%` }}
            />
          </div>

          {/* Challenge display */}
          {challenge && (
            <div className="text-center space-y-4">
              <div
                className={`text-5xl font-black py-8 px-12 rounded-xl ${challenge.displayColor} text-white shadow-lg`}
              >
                {challenge.text}
              </div>
              <p className="text-sm text-muted-foreground">
                Does the <span className="font-bold">color</span> match the <span className="font-bold">word</span>?
              </p>
            </div>
          )}

          {/* Answer buttons */}
          <div className="flex gap-8">
            <Button
              onClick={() => handleAnswer(true)}
              size="lg"
              className="px-8 py-6 text-xl bg-green-600 hover:bg-green-700"
            >
              ✓ Match
            </Button>
            <Button
              onClick={() => handleAnswer(false)}
              size="lg"
              className="px-8 py-6 text-xl bg-red-600 hover:bg-red-700"
            >
              ✗ No Match
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            ← A = Match | D → = No Match
          </div>
        </>
      )}
    </div>
  );
};

export default ColorMatchGame;
