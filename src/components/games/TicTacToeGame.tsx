import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GameSession } from "@/hooks/useGames";
import { cn } from "@/lib/utils";

interface TicTacToeGameProps {
  game: GameSession;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: Record<string, unknown>) => void;
  onEnd: (winnerId?: string) => void;
}

const TicTacToeGame = ({ game, userId, userName, onJoin, onUpdateState, onEnd }: TicTacToeGameProps) => {
  const state = game.state as {
    board: (string | null)[];
    currentPlayer: "X" | "O";
    playerX: string | null;
    playerO: string | null;
  };

  const isPlayerX = state.playerX === userId;
  const isPlayerO = state.playerO === userId;
  const isMyTurn = (isPlayerX && state.currentPlayer === "X") || (isPlayerO && state.currentPlayer === "O");
  const canJoin = !isPlayerX && !isPlayerO && (!state.playerX || !state.playerO);

  useEffect(() => {
    if (!game.players.includes(userId)) {
      onJoin();
    }
  }, []);

  const handleJoinAsPlayer = (symbol: "X" | "O") => {
    if (symbol === "X" && !state.playerX) {
      onUpdateState({ ...state, playerX: userId });
    } else if (symbol === "O" && !state.playerO) {
      onUpdateState({ ...state, playerO: userId });
    }
  };

  const checkWinner = (board: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6], // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (!isMyTurn || state.board[index]) return;

    const newBoard = [...state.board];
    newBoard[index] = state.currentPlayer;

    const winner = checkWinner(newBoard);
    if (winner) {
      onUpdateState({ ...state, board: newBoard });
      const winnerId = winner === "X" ? state.playerX : state.playerO;
      setTimeout(() => onEnd(winnerId || undefined), 1000);
      return;
    }

    if (newBoard.every(cell => cell !== null)) {
      onUpdateState({ ...state, board: newBoard });
      setTimeout(() => onEnd(), 1000);
      return;
    }

    onUpdateState({
      ...state,
      board: newBoard,
      currentPlayer: state.currentPlayer === "X" ? "O" : "X",
    });
  };

  const winner = checkWinner(state.board);
  const isDraw = !winner && state.board.every(cell => cell !== null);

  return (
    <div className="space-y-4">
      {/* Join buttons */}
      {canJoin && (
        <div className="flex gap-2">
          {!state.playerX && (
            <Button onClick={() => handleJoinAsPlayer("X")} className="flex-1">
              Play as X
            </Button>
          )}
          {!state.playerO && (
            <Button onClick={() => handleJoinAsPlayer("O")} variant="outline" className="flex-1">
              Play as O
            </Button>
          )}
        </div>
      )}

      {/* Status */}
      <div className="text-center">
        {winner ? (
          <p className="text-lg font-bold text-green-500">
            {winner === "X" && isPlayerX ? "You win!" : winner === "O" && isPlayerO ? "You win!" : `${winner} wins!`}
          </p>
        ) : isDraw ? (
          <p className="text-lg font-bold text-muted-foreground">It's a draw!</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isMyTurn ? "Your turn!" : `Waiting for ${state.currentPlayer}...`}
            {(isPlayerX || isPlayerO) && ` (You are ${isPlayerX ? "X" : "O"})`}
          </p>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {state.board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={!isMyTurn || !!cell || !!winner}
            className={cn(
              "h-20 w-20 rounded-lg border-2 text-3xl font-bold transition-all",
              "flex items-center justify-center",
              isMyTurn && !cell && !winner
                ? "border-primary hover:bg-primary/10 cursor-pointer"
                : "border-border cursor-default",
              cell === "X" && "text-blue-500",
              cell === "O" && "text-red-500"
            )}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Players */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>X: {state.playerX ? (state.playerX === userId ? "You" : "Opponent") : "Waiting..."}</span>
        <span>O: {state.playerO ? (state.playerO === userId ? "You" : "Opponent") : "Waiting..."}</span>
      </div>
    </div>
  );
};

export default TicTacToeGame;
