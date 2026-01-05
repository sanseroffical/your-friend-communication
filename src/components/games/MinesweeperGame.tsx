import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Flag, Bomb } from 'lucide-react';

const GRID_SIZE = 8;
const MINE_COUNT = 10;

interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

const MinesweeperGame = () => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [flagCount, setFlagCount] = useState(0);

  const initializeGrid = () => {
    const newGrid: Cell[][] = Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill(null).map(() => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      }))
    );

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < MINE_COUNT) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (!newGrid[row][col].isMine) {
        newGrid[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbor counts
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (!newGrid[i][j].isMine) {
          let count = 0;
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di, nj = j + dj;
              if (ni >= 0 && ni < GRID_SIZE && nj >= 0 && nj < GRID_SIZE && newGrid[ni][nj].isMine) {
                count++;
              }
            }
          }
          newGrid[i][j].neighborMines = count;
        }
      }
    }

    return newGrid;
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setGrid(initializeGrid());
    setGameOver(false);
    setWon(false);
    setFlagCount(0);
  };

  const revealCell = (row: number, col: number) => {
    if (gameOver || won || grid[row][col].isRevealed || grid[row][col].isFlagged) return;

    const newGrid = grid.map(r => r.map(c => ({ ...c })));

    if (newGrid[row][col].isMine) {
      // Reveal all mines
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          if (newGrid[i][j].isMine) newGrid[i][j].isRevealed = true;
        }
      }
      setGrid(newGrid);
      setGameOver(true);
      return;
    }

    // Flood fill reveal
    const reveal = (r: number, c: number) => {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
      if (newGrid[r][c].isRevealed || newGrid[r][c].isMine || newGrid[r][c].isFlagged) return;

      newGrid[r][c].isRevealed = true;

      if (newGrid[r][c].neighborMines === 0) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            reveal(r + di, c + dj);
          }
        }
      }
    };

    reveal(row, col);
    setGrid(newGrid);

    // Check win
    let revealedCount = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newGrid[i][j].isRevealed && !newGrid[i][j].isMine) revealedCount++;
      }
    }
    if (revealedCount === GRID_SIZE * GRID_SIZE - MINE_COUNT) {
      setWon(true);
    }
  };

  const toggleFlag = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (gameOver || won || grid[row][col].isRevealed) return;

    const newGrid = grid.map(r => r.map(c => ({ ...c })));
    newGrid[row][col].isFlagged = !newGrid[row][col].isFlagged;
    setGrid(newGrid);
    setFlagCount(prev => newGrid[row][col].isFlagged ? prev + 1 : prev - 1);
  };

  const getNumberColor = (num: number): string => {
    const colors = ['', 'text-blue-500', 'text-green-500', 'text-red-500', 'text-purple-500', 'text-yellow-600', 'text-cyan-500', 'text-pink-500', 'text-gray-700'];
    return colors[num] || '';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Minesweeper</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm flex items-center gap-1">
            <Flag className="h-3 w-3" /> {flagCount}/{MINE_COUNT}
          </span>
          <Button variant="ghost" size="icon" onClick={startNewGame}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <button
                key={`${i}-${j}`}
                onClick={() => revealCell(i, j)}
                onContextMenu={(e) => toggleFlag(i, j, e)}
                className={`aspect-square flex items-center justify-center text-xs font-bold border rounded ${
                  cell.isRevealed
                    ? cell.isMine
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-muted'
                    : 'bg-primary/10 hover:bg-primary/20'
                } ${getNumberColor(cell.neighborMines)}`}
                disabled={gameOver || won}
              >
                {cell.isRevealed ? (
                  cell.isMine ? <Bomb className="h-3 w-3" /> : (cell.neighborMines || '')
                ) : cell.isFlagged ? (
                  <Flag className="h-3 w-3 text-red-500" />
                ) : ''}
              </button>
            ))
          )}
        </div>

        {(gameOver || won) && (
          <div className={`text-center font-bold ${won ? 'text-green-500' : 'text-destructive'}`}>
            {won ? '🎉 You won!' : '💥 Game Over!'}
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Click to reveal, right-click to flag
        </p>
      </CardContent>
    </Card>
  );
};

export default MinesweeperGame;
