import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, Grid3X3, HelpCircle, Type, Hand, Circle, Layers } from "lucide-react";
import { useGames, GameType, GameSession } from "@/hooks/useGames";
import TicTacToeGame from "./games/TicTacToeGame";
import TriviaGame from "./games/TriviaGame";
import WordGuessGame from "./games/WordGuessGame";
import RockPaperScissorsGame from "./games/RockPaperScissorsGame";
import CheckersGame from "./games/CheckersGame";
import Connect4Game from "./games/Connect4Game";
import MiniGamesPanel from "./games/MiniGamesPanel";

interface GamePanelProps {
  roomCode: string;
  userId: string;
  userName: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GamePanel = ({ roomCode, userId, userName, isOpen: controlledOpen, onOpenChange }: GamePanelProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const { activeGame, isLoading, createGame, joinGame, updateGameState, endGame } = useGames(roomCode, userId);

  const handleCreateGame = async (gameType: GameType) => {
    await createGame(gameType);
  };

  const games = [
    { type: "tictactoe" as GameType, name: "Tic Tac Toe", icon: Grid3X3, desc: "Classic X's and O's" },
    { type: "trivia" as GameType, name: "Trivia", icon: HelpCircle, desc: "Test your knowledge" },
    { type: "wordguess" as GameType, name: "Word Guess", icon: Type, desc: "Guess the word" },
    { type: "rps" as GameType, name: "Rock Paper Scissors", icon: Hand, desc: "Best of 3" },
    { type: "checkers" as GameType, name: "Checkers", icon: Circle, desc: "Classic board game" },
    { type: "connect4" as GameType, name: "Connect 4", icon: Layers, desc: "Get 4 in a row" },
  ];

  const renderActiveGame = () => {
    if (!activeGame) return null;

    const gameProps = {
      game: activeGame,
      userId,
      userName,
      onJoin: () => joinGame(activeGame.id),
      onUpdateState: (state: Record<string, unknown>) => updateGameState(activeGame.id, state),
      onEnd: (winnerId?: string) => endGame(activeGame.id, winnerId),
    };

    switch (activeGame.game_type) {
      case "tictactoe":
        return <TicTacToeGame {...gameProps} />;
      case "trivia":
        return <TriviaGame {...gameProps} />;
      case "wordguess":
        return <WordGuessGame {...gameProps} />;
      case "rps":
        return <RockPaperScissorsGame {...gameProps} />;
      case "checkers":
        return <CheckersGame {...gameProps} />;
      case "connect4":
        return <Connect4Game {...gameProps} />;
      default:
        return <div>Unknown game type</div>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Gamepad2 className="h-4 w-4" />
          {activeGame && (
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Games
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="multiplayer" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="multiplayer" className="flex-1">Multiplayer</TabsTrigger>
            <TabsTrigger value="solo" className="flex-1">Mini Games</TabsTrigger>
          </TabsList>

          <TabsContent value="multiplayer" className="mt-4">
            {activeGame ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {games.find(g => g.type === activeGame.game_type)?.name || activeGame.game_type}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => endGame(activeGame.id)}>
                    End Game
                  </Button>
                </div>
                {renderActiveGame()}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Start a multiplayer game for everyone in the room!
                </p>
                {games.map((game) => (
                  <Button
                    key={game.type}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleCreateGame(game.type)}
                    disabled={isLoading}
                  >
                    <game.icon className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">{game.name}</p>
                      <p className="text-xs text-muted-foreground">{game.desc}</p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="solo" className="mt-4">
            <MiniGamesPanel />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default GamePanel;
