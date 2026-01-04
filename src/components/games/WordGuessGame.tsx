import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameSession } from "@/hooks/useGames";
import { cn } from "@/lib/utils";

interface WordGuessGameProps {
  game: GameSession;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: Record<string, unknown>) => void;
  onEnd: (winnerId?: string) => void;
}

const WordGuessGame = ({ game, userId, userName, onJoin, onUpdateState, onEnd }: WordGuessGameProps) => {
  const [currentGuess, setCurrentGuess] = useState("");

  const state = game.state as {
    word: string;
    guesses: { guess: string; result: string[] }[];
    gameOver: boolean;
  };

  const maxGuesses = 6;
  const wordLength = state.word.length;

  const checkGuess = (guess: string) => {
    const result: string[] = [];
    const wordArray = state.word.split("");
    const guessArray = guess.toUpperCase().split("");

    // First pass: mark correct positions
    for (let i = 0; i < wordLength; i++) {
      if (guessArray[i] === wordArray[i]) {
        result[i] = "correct";
        wordArray[i] = "";
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < wordLength; i++) {
      if (result[i]) continue;
      
      const index = wordArray.indexOf(guessArray[i]);
      if (index !== -1) {
        result[i] = "present";
        wordArray[index] = "";
      } else {
        result[i] = "absent";
      }
    }

    return result;
  };

  const handleSubmitGuess = () => {
    if (currentGuess.length !== wordLength) return;

    const result = checkGuess(currentGuess);
    const newGuesses = [...state.guesses, { guess: currentGuess.toUpperCase(), result }];

    const isWin = result.every(r => r === "correct");
    const isLoss = newGuesses.length >= maxGuesses && !isWin;

    onUpdateState({
      ...state,
      guesses: newGuesses,
      gameOver: isWin || isLoss,
    });

    if (isWin) {
      setTimeout(() => onEnd(userId), 1500);
    } else if (isLoss) {
      setTimeout(() => onEnd(), 1500);
    }

    setCurrentGuess("");
  };

  const getLetterClass = (status: string) => {
    switch (status) {
      case "correct":
        return "bg-green-500 text-white border-green-500";
      case "present":
        return "bg-yellow-500 text-white border-yellow-500";
      case "absent":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "border-border";
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Guess the {wordLength}-letter word! ({maxGuesses - state.guesses.length} guesses left)
      </p>

      {/* Previous guesses */}
      <div className="space-y-2">
        {state.guesses.map((g, i) => (
          <div key={i} className="flex justify-center gap-1">
            {g.guess.split("").map((letter, j) => (
              <div
                key={j}
                className={cn(
                  "w-10 h-10 flex items-center justify-center font-bold text-lg rounded border-2",
                  getLetterClass(g.result[j])
                )}
              >
                {letter}
              </div>
            ))}
          </div>
        ))}

        {/* Empty rows */}
        {Array(maxGuesses - state.guesses.length).fill(null).map((_, i) => (
          <div key={`empty-${i}`} className="flex justify-center gap-1">
            {Array(wordLength).fill(null).map((_, j) => (
              <div
                key={j}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg rounded border-2 border-border"
              />
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      {!state.gameOver && (
        <div className="flex gap-2">
          <Input
            value={currentGuess}
            onChange={(e) => setCurrentGuess(e.target.value.slice(0, wordLength))}
            placeholder={`Enter ${wordLength} letters`}
            className="text-center uppercase tracking-widest"
            maxLength={wordLength}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitGuess()}
          />
          <Button onClick={handleSubmitGuess} disabled={currentGuess.length !== wordLength}>
            Guess
          </Button>
        </div>
      )}

      {/* Game over message */}
      {state.gameOver && (
        <div className="text-center">
          {state.guesses[state.guesses.length - 1]?.result.every(r => r === "correct") ? (
            <p className="text-lg font-bold text-green-500">You got it! 🎉</p>
          ) : (
            <p className="text-lg font-bold text-red-500">
              The word was: <span className="text-foreground">{state.word}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordGuessGame;
