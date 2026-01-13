import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CheckersGameProps {
  game: any;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: any) => void;
  onEnd: (winnerId?: string) => void;
}

type Piece = 'r' | 'R' | 'b' | 'B' | null; // r=red, R=red king, b=black, B=black king
type Board = Piece[][];

const createInitialBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Place red pieces (top)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = 'r';
      }
    }
  }
  
  // Place black pieces (bottom)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = 'b';
      }
    }
  }
  
  return board;
};

const CheckersGame = ({ game, userId, userName, onJoin, onUpdateState, onEnd }: CheckersGameProps) => {
  const isPlayer = game.players?.includes(userId);
  const state = game.state as { board?: Board; turn?: string; players?: { red?: string; black?: string } } || {};
  const board = state.board || createInitialBoard();
  const currentTurn = state.turn || 'red';
  const players = state.players || {};
  
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number; captures?: { row: number; col: number }[] }[]>([]);

  const myColor = players.red === userId ? 'red' : players.black === userId ? 'black' : null;
  const isMyTurn = myColor === currentTurn;

  const handleJoin = () => {
    onJoin();
    const newPlayers = { ...players };
    if (!newPlayers.red) {
      newPlayers.red = userId;
    } else if (!newPlayers.black) {
      newPlayers.black = userId;
    }
    onUpdateState({ board, turn: currentTurn, players: newPlayers });
  };

  const getPieceColor = (piece: Piece) => {
    if (!piece) return null;
    return piece.toLowerCase() === 'r' ? 'red' : 'black';
  };

  const isKing = (piece: Piece) => piece === 'R' || piece === 'B';

  const getValidMoves = (row: number, col: number): typeof validMoves => {
    const piece = board[row][col];
    if (!piece) return [];
    const color = getPieceColor(piece);
    if (color !== myColor) return [];

    const moves: typeof validMoves = [];
    const directions = isKing(piece) 
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : color === 'red' 
        ? [[1, -1], [1, 1]] 
        : [[-1, -1], [-1, 1]];

    // Regular moves
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !board[newRow][newCol]) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    // Capture moves
    for (const [dr, dc] of directions) {
      const jumpRow = row + dr * 2;
      const jumpCol = col + dc * 2;
      const midRow = row + dr;
      const midCol = col + dc;
      if (
        jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 &&
        !board[jumpRow][jumpCol] &&
        board[midRow][midCol] &&
        getPieceColor(board[midRow][midCol]) !== color
      ) {
        moves.push({ row: jumpRow, col: jumpCol, captures: [{ row: midRow, col: midCol }] });
      }
    }

    return moves;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!isMyTurn || !isPlayer) return;

    const piece = board[row][col];
    
    if (selected) {
      const move = validMoves.find(m => m.row === row && m.col === col);
      if (move) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = newBoard[selected.row][selected.col];
        newBoard[selected.row][selected.col] = null;
        
        // Handle captures
        if (move.captures) {
          for (const cap of move.captures) {
            newBoard[cap.row][cap.col] = null;
          }
        }
        
        // King promotion
        if (row === 0 && newBoard[row][col] === 'b') newBoard[row][col] = 'B';
        if (row === 7 && newBoard[row][col] === 'r') newBoard[row][col] = 'R';

        // Check for winner
        const redCount = newBoard.flat().filter(p => p?.toLowerCase() === 'r').length;
        const blackCount = newBoard.flat().filter(p => p?.toLowerCase() === 'b').length;
        
        if (redCount === 0) {
          onEnd(players.black);
        } else if (blackCount === 0) {
          onEnd(players.red);
        } else {
          onUpdateState({
            board: newBoard,
            turn: currentTurn === 'red' ? 'black' : 'red',
            players,
          });
        }
        
        setSelected(null);
        setValidMoves([]);
      } else if (piece && getPieceColor(piece) === myColor) {
        setSelected({ row, col });
        setValidMoves(getValidMoves(row, col));
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    } else if (piece && getPieceColor(piece) === myColor) {
      setSelected({ row, col });
      setValidMoves(getValidMoves(row, col));
    }
  };

  const needsPlayer = !players.red || !players.black;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={currentTurn === 'red' ? 'default' : 'outline'}>
            🔴 Red {players.red === userId && '(You)'}
          </Badge>
          <Badge variant={currentTurn === 'black' ? 'default' : 'outline'}>
            ⚫ Black {players.black === userId && '(You)'}
          </Badge>
        </div>
      </div>

      {needsPlayer && !isPlayer && (
        <Button onClick={handleJoin} className="w-full">
          Join as {!players.red ? '🔴 Red' : '⚫ Black'}
        </Button>
      )}

      <div className="grid grid-cols-8 gap-0 border-2 border-border rounded overflow-hidden max-w-xs mx-auto">
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isDark = (rowIdx + colIdx) % 2 === 1;
            const isSelected = selected?.row === rowIdx && selected?.col === colIdx;
            const isValidMove = validMoves.some(m => m.row === rowIdx && m.col === colIdx);
            
            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                className={`w-8 h-8 flex items-center justify-center text-lg transition-colors ${
                  isDark ? 'bg-amber-800' : 'bg-amber-200'
                } ${isSelected ? 'ring-2 ring-primary ring-inset' : ''} ${
                  isValidMove ? 'bg-green-500/50' : ''
                }`}
                onClick={() => handleSquareClick(rowIdx, colIdx)}
                disabled={!isMyTurn || !isPlayer}
              >
                {cell && (
                  <span className={`${isKing(cell) ? 'text-yellow-400' : ''}`}>
                    {cell.toLowerCase() === 'r' ? '🔴' : '⚫'}
                    {isKing(cell) && <span className="absolute text-xs">👑</span>}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {isPlayer && (
        <p className="text-sm text-center text-muted-foreground">
          {isMyTurn ? "Your turn! Click a piece to move." : "Waiting for opponent..."}
        </p>
      )}
    </div>
  );
};

export default CheckersGame;
