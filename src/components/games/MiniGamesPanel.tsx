import { useState } from "react";
import { Button } from "@/components/ui/button";
import SnakeGame from "./SnakeGame";
import MemoryGame from "./MemoryGame";
import ClickerGame from "./ClickerGame";

type MiniGame = "none" | "snake" | "memory" | "clicker";

const miniGames = [
  { id: "snake" as MiniGame, name: "🐍 Snake", desc: "Classic snake game" },
  { id: "memory" as MiniGame, name: "🧠 Memory", desc: "Match the pairs" },
  { id: "clicker" as MiniGame, name: "👆 Clicker", desc: "Click fast!" },
];

const MiniGamesPanel = () => {
  const [activeGame, setActiveGame] = useState<MiniGame>("none");

  if (activeGame === "snake") {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setActiveGame("none")}>
          ← Back to games
        </Button>
        <SnakeGame />
      </div>
    );
  }

  if (activeGame === "memory") {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setActiveGame("none")}>
          ← Back to games
        </Button>
        <MemoryGame />
      </div>
    );
  }

  if (activeGame === "clicker") {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setActiveGame("none")}>
          ← Back to games
        </Button>
        <ClickerGame />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Solo mini-games to play while chatting!
      </p>
      {miniGames.map((game) => (
        <Button
          key={game.id}
          variant="outline"
          className="w-full justify-start h-auto py-3"
          onClick={() => setActiveGame(game.id)}
        >
          <div className="text-left">
            <p className="font-medium">{game.name}</p>
            <p className="text-xs text-muted-foreground">{game.desc}</p>
          </div>
        </Button>
      ))}
    </div>
  );
};

export default MiniGamesPanel;
