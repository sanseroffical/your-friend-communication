import { useState } from "react";
import { Button } from "@/components/ui/button";
import SnakeGame from "./SnakeGame";
import MemoryGame from "./MemoryGame";
import ClickerGame from "./ClickerGame";
import HangmanGame from "./HangmanGame";
import Game2048 from "./Game2048";
import MinesweeperGame from "./MinesweeperGame";
import TypingRaceGame from "./TypingRaceGame";

type MiniGame = "none" | "snake" | "memory" | "clicker" | "hangman" | "2048" | "minesweeper" | "typing";

const miniGames = [
  { id: "snake" as MiniGame, name: "🐍 Snake", desc: "Classic snake game" },
  { id: "memory" as MiniGame, name: "🧠 Memory", desc: "Match the pairs" },
  { id: "clicker" as MiniGame, name: "👆 Clicker", desc: "Click fast!" },
  { id: "hangman" as MiniGame, name: "🎯 Hangman", desc: "Guess the word" },
  { id: "2048" as MiniGame, name: "🔢 2048", desc: "Slide & merge tiles" },
  { id: "minesweeper" as MiniGame, name: "💣 Minesweeper", desc: "Avoid the mines" },
  { id: "typing" as MiniGame, name: "⌨️ Typing Race", desc: "Test your speed" },
];

const MiniGamesPanel = () => {
  const [activeGame, setActiveGame] = useState<MiniGame>("none");

  const renderGame = () => {
    switch (activeGame) {
      case "snake":
        return <SnakeGame />;
      case "memory":
        return <MemoryGame />;
      case "clicker":
        return <ClickerGame />;
      case "hangman":
        return <HangmanGame />;
      case "2048":
        return <Game2048 />;
      case "minesweeper":
        return <MinesweeperGame />;
      case "typing":
        return <TypingRaceGame />;
      default:
        return null;
    }
  };

  if (activeGame !== "none") {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setActiveGame("none")}>
          ← Back to games
        </Button>
        {renderGame()}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Solo mini-games to play while chatting!
      </p>
      <div className="grid grid-cols-2 gap-2">
        {miniGames.map((game) => (
          <Button
            key={game.id}
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => setActiveGame(game.id)}
          >
            <div className="text-left">
              <p className="font-medium text-sm">{game.name}</p>
              <p className="text-xs text-muted-foreground">{game.desc}</p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default MiniGamesPanel;
