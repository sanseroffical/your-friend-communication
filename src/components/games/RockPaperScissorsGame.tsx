import { Button } from "@/components/ui/button";
import { GameSession } from "@/hooks/useGames";
import { cn } from "@/lib/utils";

interface RockPaperScissorsGameProps {
  game: GameSession;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: Record<string, unknown>) => void;
  onEnd: (winnerId?: string) => void;
}

type Choice = "rock" | "paper" | "scissors";

const choices: { choice: Choice; emoji: string; label: string }[] = [
  { choice: "rock", emoji: "🪨", label: "Rock" },
  { choice: "paper", emoji: "📄", label: "Paper" },
  { choice: "scissors", emoji: "✂️", label: "Scissors" },
];

const RockPaperScissorsGame = ({ 
  game, 
  userId, 
  userName, 
  onJoin, 
  onUpdateState, 
  onEnd 
}: RockPaperScissorsGameProps) => {
  const state = game.state as {
    choices: Record<string, Choice>;
    round: number;
    scores: Record<string, number>;
    lastResult?: { winner: string | null; p1Choice: Choice; p2Choice: Choice };
  };

  const players = game.players;
  const myChoice = state.choices[userId];
  const otherPlayerId = players.find(p => p !== userId);
  const otherChoice = otherPlayerId ? state.choices[otherPlayerId] : null;
  const myScore = state.scores[userId] || 0;
  const otherScore = otherPlayerId ? state.scores[otherPlayerId] || 0 : 0;

  const getWinner = (c1: Choice, c2: Choice): number => {
    if (c1 === c2) return 0;
    if (
      (c1 === "rock" && c2 === "scissors") ||
      (c1 === "paper" && c2 === "rock") ||
      (c1 === "scissors" && c2 === "paper")
    ) {
      return 1;
    }
    return -1;
  };

  const handleChoice = (choice: Choice) => {
    if (myChoice) return;

    const newChoices = { ...state.choices, [userId]: choice };
    
    // Check if both players have chosen
    if (otherPlayerId && newChoices[otherPlayerId]) {
      const result = getWinner(choice, newChoices[otherPlayerId]);
      const newScores = { ...state.scores };
      
      if (result === 1) {
        newScores[userId] = (newScores[userId] || 0) + 1;
      } else if (result === -1) {
        newScores[otherPlayerId] = (newScores[otherPlayerId] || 0) + 1;
      }

      // Check for game end (best of 3)
      if (newScores[userId] >= 2 || (otherPlayerId && newScores[otherPlayerId] >= 2)) {
        onUpdateState({
          ...state,
          choices: newChoices,
          scores: newScores,
          lastResult: {
            winner: result === 1 ? userId : result === -1 ? otherPlayerId : null,
            p1Choice: choice,
            p2Choice: newChoices[otherPlayerId],
          },
        });
        
        setTimeout(() => {
          const winnerId = newScores[userId] >= 2 ? userId : otherPlayerId;
          onEnd(winnerId);
        }, 2000);
        return;
      }

      // Next round
      setTimeout(() => {
        onUpdateState({
          ...state,
          choices: {},
          round: state.round + 1,
          scores: newScores,
          lastResult: {
            winner: result === 1 ? userId : result === -1 ? otherPlayerId : null,
            p1Choice: choice,
            p2Choice: newChoices[otherPlayerId],
          },
        });
      }, 2000);
    }

    onUpdateState({ ...state, choices: newChoices });
  };

  const bothChosen = myChoice && otherChoice;

  return (
    <div className="space-y-6">
      {/* Scores */}
      <div className="flex justify-around text-center">
        <div>
          <p className="text-sm text-muted-foreground">You</p>
          <p className="text-2xl font-bold">{myScore}</p>
        </div>
        <div className="text-muted-foreground">vs</div>
        <div>
          <p className="text-sm text-muted-foreground">Opponent</p>
          <p className="text-2xl font-bold">{otherScore}</p>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Round {state.round} • Best of 3
      </p>

      {/* Last result */}
      {state.lastResult && (
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm">
            {state.lastResult.winner === userId && "You won! "}
            {state.lastResult.winner === otherPlayerId && "They won! "}
            {!state.lastResult.winner && "It's a tie! "}
            ({choices.find(c => c.choice === state.lastResult?.p1Choice)?.emoji} vs {choices.find(c => c.choice === state.lastResult?.p2Choice)?.emoji})
          </p>
        </div>
      )}

      {/* Status */}
      {!bothChosen && (
        <p className="text-center text-muted-foreground">
          {myChoice ? "Waiting for opponent..." : "Make your choice!"}
        </p>
      )}

      {/* Choice buttons */}
      <div className="flex justify-center gap-4">
        {choices.map(({ choice, emoji, label }) => (
          <Button
            key={choice}
            variant={myChoice === choice ? "default" : "outline"}
            className={cn(
              "h-20 w-20 flex flex-col gap-1",
              myChoice && myChoice !== choice && "opacity-50"
            )}
            onClick={() => handleChoice(choice)}
            disabled={!!myChoice}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      {/* Reveal */}
      {bothChosen && (
        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <p className="text-4xl">{choices.find(c => c.choice === myChoice)?.emoji}</p>
            <p className="text-sm text-muted-foreground mt-1">You</p>
          </div>
          <span className="text-2xl">vs</span>
          <div className="text-center">
            <p className="text-4xl">{choices.find(c => c.choice === otherChoice)?.emoji}</p>
            <p className="text-sm text-muted-foreground mt-1">Them</p>
          </div>
        </div>
      )}

      {players.length < 2 && (
        <p className="text-center text-sm text-yellow-500">
          Waiting for another player to join...
        </p>
      )}
    </div>
  );
};

export default RockPaperScissorsGame;
