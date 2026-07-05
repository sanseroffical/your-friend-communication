import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Lazy load games for better performance
const SnakeGame = lazy(() => import("./SnakeGame"));
const MemoryGame = lazy(() => import("./MemoryGame"));
const ClickerGame = lazy(() => import("./ClickerGame"));
const HangmanGame = lazy(() => import("./HangmanGame"));
const Game2048 = lazy(() => import("./Game2048"));
const MinesweeperGame = lazy(() => import("./MinesweeperGame"));
const TypingRaceGame = lazy(() => import("./TypingRaceGame"));
const SimonSaysGame = lazy(() => import("./SimonSaysGame"));
const PongGame = lazy(() => import("./PongGame"));
const FlappyGame = lazy(() => import("./FlappyGame"));
const BrickBreakerGame = lazy(() => import("./BrickBreakerGame"));
const TetrisGame = lazy(() => import("./TetrisGame"));
const SpaceInvadersGame = lazy(() => import("./SpaceInvadersGame"));
const SudokuGame = lazy(() => import("./SudokuGame"));
const WordleGame = lazy(() => import("./WordleGame"));
const MazeGame = lazy(() => import("./MazeGame"));
const SolitaireGame = lazy(() => import("./SolitaireGame"));
const ColorMatchGame = lazy(() => import("./ColorMatchGame"));
const ReactionTimeGame = lazy(() => import("./ReactionTimeGame"));
const SlidingPuzzleGame = lazy(() => import("./SlidingPuzzleGame"));
const PacManGame = lazy(() => import("./PacManGame"));
const CardMatchSpeedGame = lazy(() => import("./CardMatchSpeedGame"));
const CrosswordGame = lazy(() => import("./CrosswordGame"));
const MathChallengeGame = lazy(() => import("./MathChallengeGame"));
const WhackAMoleGame = lazy(() => import("./WhackAMoleGame"));
const TicTacToeGame = lazy(() => import("./TicTacToeGame"));
const RockPaperScissorsGame = lazy(() => import("./RockPaperScissorsGame"));
const WordGuessGame = lazy(() => import("./WordGuessGame"));
const Connect4Game = lazy(() => import("./Connect4Game"));
const CheckersGame = lazy(() => import("./CheckersGame"));
const TriviaGame = lazy(() => import("./TriviaGame"));

type MiniGame = "none" | "snake" | "memory" | "clicker" | "hangman" | "2048" | "minesweeper" | "typing" | "simon" | "pong" | "flappy" | "brickbreaker" | "tetris" | "invaders" | "sudoku" | "wordle" | "maze" | "solitaire" | "colormatch" | "reaction" | "sliding" | "pacman" | "cardspeed" | "crossword" | "math" | "whackamole" | "tictactoe" | "rps" | "wordguess" | "connect4" | "checkers" | "trivia";

const miniGames = [
  { id: "snake" as MiniGame, name: "🐍 Snake", desc: "Classic snake game" },
  { id: "memory" as MiniGame, name: "🧠 Memory", desc: "Match the pairs" },
  { id: "clicker" as MiniGame, name: "👆 Clicker", desc: "Click fast!" },
  { id: "hangman" as MiniGame, name: "🎯 Hangman", desc: "Guess the word" },
  { id: "2048" as MiniGame, name: "🔢 2048", desc: "Slide & merge tiles" },
  { id: "minesweeper" as MiniGame, name: "💣 Minesweeper", desc: "Avoid the mines" },
  { id: "typing" as MiniGame, name: "⌨️ Typing Race", desc: "Test your speed" },
  { id: "simon" as MiniGame, name: "🎨 Simon Says", desc: "Memory pattern game" },
  { id: "pong" as MiniGame, name: "🏓 Pong", desc: "Classic arcade game" },
  { id: "flappy" as MiniGame, name: "🐤 Flappy Bird", desc: "Fly through pipes" },
  { id: "brickbreaker" as MiniGame, name: "🧱 Brick Breaker", desc: "Break all bricks" },
  { id: "tetris" as MiniGame, name: "🟦 Tetris", desc: "Stack the blocks" },
  { id: "invaders" as MiniGame, name: "👾 Space Invaders", desc: "Defend Earth!" },
  { id: "sudoku" as MiniGame, name: "🔢 Sudoku", desc: "Number puzzle" },
  { id: "wordle" as MiniGame, name: "🔤 Wordle", desc: "Guess 5-letter word" },
  { id: "maze" as MiniGame, name: "🌀 Maze Runner", desc: "Escape the maze" },
  { id: "solitaire" as MiniGame, name: "🃏 Solitaire", desc: "Classic card game" },
  { id: "colormatch" as MiniGame, name: "🎨 Color Match", desc: "Fast color matching" },
  { id: "reaction" as MiniGame, name: "⚡ Reaction", desc: "Test your reflexes" },
  { id: "sliding" as MiniGame, name: "🧩 Sliding Puzzle", desc: "Arrange the tiles" },
  { id: "pacman" as MiniGame, name: "👾 Pac-Man", desc: "Classic arcade chase" },
  { id: "cardspeed" as MiniGame, name: "🃏 Speed Match", desc: "Fast card matching" },
  { id: "crossword" as MiniGame, name: "🧩 Crossword", desc: "Word puzzle", isNew: true },
  { id: "math" as MiniGame, name: "🔢 Math Challenge", desc: "Quick arithmetic", isNew: true },
  { id: "whackamole" as MiniGame, name: "🔨 Whack-a-Mole", desc: "Whack the moles!", isNew: true },
  { id: "tictactoe" as MiniGame, name: "❌ Tic-Tac-Toe", desc: "Classic 3-in-a-row", isNew: true },
  { id: "rps" as MiniGame, name: "✂️ Rock Paper Scissors", desc: "Beat the CPU", isNew: true },
  { id: "wordguess" as MiniGame, name: "📝 Word Guess", desc: "Guess the word", isNew: true },
  { id: "connect4" as MiniGame, name: "🔴 Connect 4", desc: "Line up four", isNew: true },
  { id: "checkers" as MiniGame, name: "♟️ Checkers", desc: "Jump and capture", isNew: true },
  { id: "trivia" as MiniGame, name: "❓ Trivia", desc: "Test your knowledge", isNew: true },
];

const GameLoader = () => (
  <div className="flex items-center justify-center h-48">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const MiniGamesPanel = () => {
  const [activeGame, setActiveGame] = useState<MiniGame>("none");

  const renderGame = () => {
    const GameComponent = {
      snake: SnakeGame,
      memory: MemoryGame,
      clicker: ClickerGame,
      hangman: HangmanGame,
      "2048": Game2048,
      minesweeper: MinesweeperGame,
      typing: TypingRaceGame,
      simon: SimonSaysGame,
      pong: PongGame,
      flappy: FlappyGame,
      brickbreaker: BrickBreakerGame,
      tetris: TetrisGame,
      invaders: SpaceInvadersGame,
      sudoku: SudokuGame,
      wordle: WordleGame,
      maze: MazeGame,
      solitaire: SolitaireGame,
      colormatch: ColorMatchGame,
      reaction: ReactionTimeGame,
      sliding: SlidingPuzzleGame,
      pacman: PacManGame,
      cardspeed: CardMatchSpeedGame,
      crossword: CrosswordGame,
      math: MathChallengeGame,
      whackamole: WhackAMoleGame,
    }[activeGame];

    if (!GameComponent) return null;

    return (
      <Suspense fallback={<GameLoader />}>
        <GameComponent />
      </Suspense>
    );
  };

  if (activeGame !== "none") {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setActiveGame("none")}>
          ← Back to games
        </Button>
        <ScrollArea className="h-[500px]">
          {renderGame()}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Solo mini-games to play while chatting!
      </p>
      <ScrollArea className="h-[400px] pr-2">
        <div className="grid grid-cols-2 gap-2">
          {miniGames.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              className="w-full justify-start h-auto py-3 relative"
              onClick={() => setActiveGame(game.id)}
            >
              <div className="text-left">
                <p className="font-medium text-sm">{game.name}</p>
                <p className="text-xs text-muted-foreground">{game.desc}</p>
              </div>
              {(game as any).isNew && (
                <span className="absolute top-1 right-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MiniGamesPanel;
