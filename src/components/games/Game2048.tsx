import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

type Grid = number[][];

const GRID_SIZE = 4;

const getTileColor = (value: number): string => {
  const colors: Record<number, string> = {
    2: 'bg-amber-100 text-amber-900',
    4: 'bg-amber-200 text-amber-900',
    8: 'bg-orange-300 text-white',
    16: 'bg-orange-400 text-white',
    32: 'bg-orange-500 text-white',
    64: 'bg-orange-600 text-white',
    128: 'bg-yellow-400 text-white',
    256: 'bg-yellow-500 text-white',
    512: 'bg-yellow-600 text-white',
    1024: 'bg-yellow-700 text-white',
    2048: 'bg-yellow-800 text-white',
  };
  return colors[value] || 'bg-purple-600 text-white';
};

const Game2048 = () => {
  const [grid, setGrid] = useState<Grid>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initializeGrid = useCallback(() => {
    const newGrid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    return newGrid;
  }, []);

  const addRandomTile = (currentGrid: Grid) => {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const checkGameOver = (currentGrid: Grid): boolean => {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) return false;
        if (j < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i][j + 1]) return false;
        if (i < GRID_SIZE - 1 && currentGrid[i][j] === currentGrid[i + 1][j]) return false;
      }
    }
    return true;
  };

  const moveGrid = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return;

    const newGrid = grid.map(row => [...row]);
    let moved = false;
    let newScore = score;

    const rotate = (g: Grid, times: number): Grid => {
      let result = g.map(row => [...row]);
      for (let t = 0; t < times; t++) {
        const rotated: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 0; j < GRID_SIZE; j++) {
            rotated[j][GRID_SIZE - 1 - i] = result[i][j];
          }
        }
        result = rotated;
      }
      return result;
    };

    const slideLeft = (g: Grid): [Grid, boolean, number] => {
      const result = g.map(row => [...row]);
      let didMove = false;
      let addedScore = 0;

      for (let i = 0; i < GRID_SIZE; i++) {
        const row = result[i].filter(val => val !== 0);
        const newRow: number[] = [];
        
        for (let j = 0; j < row.length; j++) {
          if (j < row.length - 1 && row[j] === row[j + 1]) {
            newRow.push(row[j] * 2);
            addedScore += row[j] * 2;
            j++;
            didMove = true;
          } else {
            newRow.push(row[j]);
          }
        }

        while (newRow.length < GRID_SIZE) {
          newRow.push(0);
        }

        if (result[i].join(',') !== newRow.join(',')) {
          didMove = true;
        }
        result[i] = newRow;
      }

      return [result, didMove, addedScore];
    };

    const rotations = { left: 0, up: 1, right: 2, down: 3 };
    const rotation = rotations[direction];

    let rotated = rotate(newGrid, rotation);
    const [slid, didMove, addedScore] = slideLeft(rotated);
    const final = rotate(slid, (4 - rotation) % 4);

    if (didMove) {
      addRandomTile(final);
      newScore += addedScore;
      moved = true;
    }

    if (moved) {
      setGrid(final);
      setScore(newScore);
      if (checkGameOver(final)) {
        setGameOver(true);
      }
    }
  }, [grid, score, gameOver]);

  useEffect(() => {
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
  }, [initializeGrid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); moveGrid('up'); break;
        case 'ArrowDown': e.preventDefault(); moveGrid('down'); break;
        case 'ArrowLeft': e.preventDefault(); moveGrid('left'); break;
        case 'ArrowRight': e.preventDefault(); moveGrid('right'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveGrid]);

  const startNewGame = () => {
    setGrid(initializeGrid());
    setScore(0);
    setGameOver(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">2048</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">Score: {score}</span>
          <Button variant="ghost" size="icon" onClick={startNewGame}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-1 bg-muted p-2 rounded-lg">
          {grid.map((row, i) =>
            row.map((cell, j) => (
              <div
                key={`${i}-${j}`}
                className={`aspect-square flex items-center justify-center rounded font-bold text-sm ${
                  cell === 0 ? 'bg-muted-foreground/10' : getTileColor(cell)
                }`}
              >
                {cell !== 0 && cell}
              </div>
            ))
          )}
        </div>

        {gameOver && (
          <div className="text-center text-destructive font-bold">
            Game Over! Final Score: {score}
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          <div />
          <Button variant="outline" size="sm" onClick={() => moveGrid('up')}>↑</Button>
          <div />
          <Button variant="outline" size="sm" onClick={() => moveGrid('left')}>←</Button>
          <Button variant="outline" size="sm" onClick={() => moveGrid('down')}>↓</Button>
          <Button variant="outline" size="sm" onClick={() => moveGrid('right')}>→</Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Use arrow keys or buttons to play
        </p>
      </CardContent>
    </Card>
  );
};

export default Game2048;
