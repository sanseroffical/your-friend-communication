import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Connect4GameProps {
  game: any;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: any) => void;
  onEnd: (winnerId?: string) => void;
}

const ROWS = 6;
const COLS = 7;

const createEmptyBoard = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const Connect4Game = ({ game, userId, userName, onJoin, onUpdateState, onEnd }: Connect4GameProps) => {
  const isPlayer = game.players?.includes(userId);
  const state = game.state as { board?: (string | null)[][]; turn?: string; players?: { red?: string; yellow?: string } } || {};
  const board = state.board || createEmptyBoard();
  const currentTurn = state.turn || 'red';
  const players = state.players || {};

  const myColor = players.red === userId ? 'red' : players.yellow === userId ? 'yellow' : null;
  const isMyTurn = myColor === currentTurn;

  const handleJoin = () => {
    onJoin();
    const newPlayers = { ...players };
    if (!newPlayers.red) {
      newPlayers.red = userId;
    } else if (!newPlayers.yellow) {
      newPlayers.yellow = userId;
    }
    onUpdateState({ board, turn: currentTurn, players: newPlayers });
  };

  const checkWinner = (board: (string | null)[][], color: string): boolean => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if (board[row][col] === color && 
            board[row][col + 1] === color && 
            board[row][col + 2] === color && 
            board[row][col + 3] === color) {
          return true;
        }
      }
    }
    
    // Check vertical
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col] === color && 
            board[row + 1][col] === color && 
            board[row + 2][col] === color && 
            board[row + 3][col] === color) {
          return true;
        }
      }
    }
    
    // Check diagonal (down-right)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if (board[row][col] === color && 
            board[row + 1][col + 1] === color && 
            board[row + 2][col + 2] === color && 
            board[row + 3][col + 3] === color) {
          return true;
        }
      }
    }
    
    // Check diagonal (up-right)
    for (let row = 3; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        if (board[row][col] === color && 
            board[row - 1][col + 1] === color && 
            board[row - 2][col + 2] === color && 
            board[row - 3][col + 3] === color) {
          return true;
        }
      }
    }
    
    return false;
  };

  const dropPiece = (col: number) => {
    if (!isMyTurn || !isPlayer) return;
    
    const newBoard = board.map(r => [...r]);
    
    // Find lowest empty row in column
    let targetRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!newBoard[row][col]) {
        targetRow = row;
        break;
      }
    }
    
    if (targetRow === -1) return; // Column full
    
    newBoard[targetRow][col] = currentTurn;
    
    if (checkWinner(newBoard, currentTurn)) {
      onEnd(currentTurn === 'red' ? players.red : players.yellow);
    } else if (newBoard.flat().every(cell => cell !== null)) {
      onEnd(); // Draw
    } else {
      onUpdateState({
        board: newBoard,
        turn: currentTurn === 'red' ? 'yellow' : 'red',
        players,
      });
    }
  };

  const needsPlayer = !players.red || !players.yellow;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={currentTurn === 'red' ? 'default' : 'outline'} className="bg-red-500">
            🔴 {players.red === userId && '(You)'}
          </Badge>
          <Badge variant={currentTurn === 'yellow' ? 'default' : 'outline'} className="bg-yellow-500">
            🟡 {players.yellow === userId && '(You)'}
          </Badge>
        </div>
      </div>

      {needsPlayer && !isPlayer && (
        <Button onClick={handleJoin} className="w-full">
          Join as {!players.red ? '🔴 Red' : '🟡 Yellow'}
        </Button>
      )}

      <div className="bg-blue-600 p-2 rounded-lg inline-block mx-auto">
        <div className="grid grid-cols-7 gap-1">
          {/* Column buttons */}
          {Array(COLS).fill(null).map((_, col) => (
            <button
              key={`drop-${col}`}
              className="w-8 h-6 text-xs bg-blue-700 hover:bg-blue-500 rounded text-white disabled:opacity-50"
              onClick={() => dropPiece(col)}
              disabled={!isMyTurn || !isPlayer || board[0][col] !== null}
            >
              ↓
            </button>
          ))}
          
          {/* Board */}
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center"
              >
                {cell && (
                  <div className={`w-6 h-6 rounded-full ${
                    cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                  }`} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isPlayer && (
        <p className="text-sm text-center text-muted-foreground">
          {isMyTurn ? "Your turn! Drop a piece." : "Waiting for opponent..."}
        </p>
      )}
    </div>
  );
};

export default Connect4Game;
