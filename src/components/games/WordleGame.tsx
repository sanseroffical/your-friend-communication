import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

const WORDS = [
  "REACT", "WORLD", "BRAIN", "FLAME", "GRAPE", "HOUSE", "LIGHT", "MONEY",
  "PIZZA", "QUICK", "SHORE", "TIGER", "UNITY", "VOICE", "WATER", "YOUTH",
  "BEACH", "CLOUD", "DANCE", "EARTH", "FLASH", "GHOST", "HEART", "JUICE",
  "KNIFE", "LEMON", "MAGIC", "NIGHT", "OCEAN", "PIANO", "QUEEN", "ROBOT",
  "SNAKE", "TRAIN", "UNCLE", "VIVID", "WITCH", "YOUNG", "ZEBRA", "APPLE"
];

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

type LetterStatus = "correct" | "present" | "absent" | "empty";

interface LetterState {
  letter: string;
  status: LetterStatus;
}

const WordleGame = () => {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<LetterState[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [usedLetters, setUsedLetters] = useState<Record<string, LetterStatus>>({});
  const [shake, setShake] = useState(false);

  const initGame = useCallback(() => {
    setTargetWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuesses([]);
    setCurrentGuess("");
    setGameOver(false);
    setWon(false);
    setUsedLetters({});
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkGuess = (guess: string): LetterState[] => {
    const result: LetterState[] = [];
    const targetLetters = targetWord.split("");
    const guessLetters = guess.split("");
    const letterCounts: Record<string, number> = {};

    // Count letters in target
    targetLetters.forEach(letter => {
      letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });

    // First pass: mark correct letters
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = { letter, status: "correct" };
        letterCounts[letter]--;
      }
    });

    // Second pass: mark present/absent letters
    guessLetters.forEach((letter, i) => {
      if (!result[i]) {
        if (letterCounts[letter] && letterCounts[letter] > 0) {
          result[i] = { letter, status: "present" };
          letterCounts[letter]--;
        } else {
          result[i] = { letter, status: "absent" };
        }
      }
    });

    return result;
  };

  const submitGuess = () => {
    if (currentGuess.length !== 5) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const result = checkGuess(currentGuess);
    const newGuesses = [...guesses, result];
    setGuesses(newGuesses);

    // Update used letters
    const newUsedLetters = { ...usedLetters };
    result.forEach(({ letter, status }) => {
      const current = newUsedLetters[letter];
      if (!current || status === "correct" || (status === "present" && current === "absent")) {
        newUsedLetters[letter] = status;
      }
    });
    setUsedLetters(newUsedLetters);

    if (currentGuess === targetWord) {
      setWon(true);
      setGameOver(true);
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
    }

    setCurrentGuess("");
  };

  const handleKeyPress = (key: string) => {
    if (gameOver) return;

    if (key === "ENTER") {
      submitGuess();
    } else if (key === "⌫") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < 5) {
      setCurrentGuess(prev => prev + key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      if (e.key === "Enter") {
        submitGuess();
      } else if (e.key === "Backspace") {
        setCurrentGuess(prev => prev.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
        setCurrentGuess(prev => prev + e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver, currentGuess, targetWord, guesses]);

  const getLetterStyle = (status: LetterStatus) => {
    switch (status) {
      case "correct":
        return "bg-green-600 text-white border-green-600";
      case "present":
        return "bg-yellow-500 text-white border-yellow-500";
      case "absent":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-background border-border";
    }
  };

  const getKeyStyle = (letter: string) => {
    const status = usedLetters[letter];
    if (!status) return "bg-muted hover:bg-muted/80";
    return getLetterStyle(status);
  };

  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < 6; i++) {
      const row = [];
      for (let j = 0; j < 5; j++) {
        let letter = "";
        let status: LetterStatus = "empty";

        if (guesses[i]) {
          letter = guesses[i][j].letter;
          status = guesses[i][j].status;
        } else if (i === guesses.length) {
          letter = currentGuess[j] || "";
        }

        row.push(
          <div
            key={j}
            className={`w-12 h-12 border-2 flex items-center justify-center text-xl font-bold rounded transition-all ${getLetterStyle(status)} ${i === guesses.length && shake ? "animate-pulse" : ""}`}
          >
            {letter}
          </div>
        );
      }
      rows.push(
        <div key={i} className="flex gap-1 justify-center">
          {row}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-bold">🔤 Wordle</h3>
      <p className="text-sm text-muted-foreground">Guess the 5-letter word in 6 tries</p>

      <div className="flex flex-col gap-1">
        {renderGrid()}
      </div>

      {gameOver && (
        <div className="text-center py-2">
          {won ? (
            <p className="text-green-500 font-bold">🎉 Congratulations! You won!</p>
          ) : (
            <p className="text-destructive font-bold">The word was: {targetWord}</p>
          )}
          <Button onClick={initGame} className="mt-2">
            Play Again
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {KEYBOARD_ROWS.map((row, i) => (
          <div key={i} className="flex gap-1 justify-center">
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={gameOver}
                className={`${key.length > 1 ? "px-2 text-xs" : "w-8"} h-10 rounded font-semibold transition-colors ${getKeyStyle(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordleGame;
