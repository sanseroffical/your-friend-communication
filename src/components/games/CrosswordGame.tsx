import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameScores } from '@/hooks/useGameScores';

interface ClueCell {
  letter: string;
  guess: string;
  number?: number;
  isBlack: boolean;
}

const PUZZLES = [
  {
    grid: [
      ['C', 'A', 'T', '#', 'D'],
      ['A', '#', 'E', '#', 'O'],
      ['R', 'U', 'N', '#', 'G'],
      ['#', '#', '#', '#', '#'],
      ['S', 'U', 'N', '#', '#'],
    ],
    across: [
      { number: 1, text: 'A furry pet that says meow', answer: 'CAT', row: 0, col: 0 },
      { number: 4, text: 'Canine pet', answer: 'DOG', row: 0, col: 4 },
      { number: 5, text: 'To move quickly on foot', answer: 'RUN', row: 2, col: 0 },
      { number: 6, text: 'Star that gives us light', answer: 'SUN', row: 4, col: 0 },
    ],
    down: [
      { number: 1, text: 'An automobile', answer: 'CAR', row: 0, col: 0 },
      { number: 2, text: 'Number after nine', answer: 'TEN', row: 0, col: 2 },
      { number: 3, text: 'Animal that says woof', answer: 'DOG', row: 0, col: 4 },
    ],
  },
  {
    grid: [
      ['B', 'E', 'D', '#', 'H'],
      ['O', '#', 'A', '#', 'A'],
      ['X', 'Y', 'Y', '#', 'T'],
      ['#', '#', '#', '#', '#'],
      ['P', 'E', 'N', '#', '#'],
    ],
    across: [
      { number: 1, text: 'Where you sleep', answer: 'BED', row: 0, col: 0 },
      { number: 4, text: 'What you wear on your head', answer: 'HAT', row: 0, col: 4 },
      { number: 5, text: '24 hours', answer: 'DAY', row: 1, col: 2 },
      { number: 6, text: 'Write with this', answer: 'PEN', row: 4, col: 0 },
    ],
    down: [
      { number: 1, text: 'Container shape', answer: 'BOX', row: 0, col: 0 },
      { number: 2, text: 'Period of 24 hours', answer: 'DAY', row: 0, col: 2 },
      { number: 3, text: 'Head covering', answer: 'HAT', row: 0, col: 4 },
    ],
  },
];

const CrosswordGame = () => {
  const { submitScore } = useGameScores('crossword');
  const [puzzle, setPuzzle] = useState(PUZZLES[0]);
  const [cells, setCells] = useState<ClueCell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const initializePuzzle = useCallback(() => {
    const newPuzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    setPuzzle(newPuzzle);
    
    const newCells: ClueCell[][] = newPuzzle.grid.map((row) =>
      row.map((cell) => ({
        letter: cell === '#' ? '' : cell,
        guess: '',
        isBlack: cell === '#',
      }))
    );

    let num = 1;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (newCells[r][c].isBlack) continue;
        const needsNumber =
          (c === 0 || newCells[r][c - 1].isBlack) ||
          (r === 0 || newCells[r - 1][c].isBlack);
        if (needsNumber) {
          newCells[r][c].number = num++;
        }
      }
    }

    setCells(newCells);
    setSelectedCell(null);
    setIsComplete(false);
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    initializePuzzle();
  }, [initializePuzzle]);

  useEffect(() => {
    if (cells.length === 0) return;
    
    let complete = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!cells[r][c].isBlack && cells[r][c].guess.toUpperCase() !== cells[r][c].letter) {
          complete = false;
          break;
        }
      }
      if (!complete) break;
    }
    
    if (complete && !isComplete) {
      setIsComplete(true);
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const score = Math.max(1000 - timeSeconds * 10, 100);
      submitScore(score, timeSeconds);
    }
  }, [cells, isComplete, startTime, submitScore]);

  const handleCellClick = (row: number, col: number) => {
    if (cells[row][col].isBlack) return;
    
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ row, col });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (isComplete) return;
    
    const key = e.key.toUpperCase();
    
    if (key.length === 1 && key >= 'A' && key <= 'Z') {
      const newCells = [...cells];
      newCells[row][col] = { ...newCells[row][col], guess: key };
      setCells(newCells);
      
      if (direction === 'across') {
        for (let c = col + 1; c < 5; c++) {
          if (!cells[row][c].isBlack) {
            setSelectedCell({ row, col: c });
            break;
          }
        }
      } else {
        for (let r = row + 1; r < 5; r++) {
          if (!cells[r][col].isBlack) {
            setSelectedCell({ row: r, col });
            break;
          }
        }
      }
    } else if (key === 'BACKSPACE') {
      const newCells = [...cells];
      newCells[row][col] = { ...newCells[row][col], guess: '' };
      setCells(newCells);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">🧩 Crossword</h3>
        <Badge variant="outline">
          {direction === 'across' ? '→ Across' : '↓ Down'}
        </Badge>
      </div>

      {isComplete && (
        <div className="text-center py-4 bg-primary/10 rounded-lg">
          <p className="text-xl font-bold text-primary">🎉 Puzzle Complete!</p>
          <Button onClick={initializePuzzle} className="mt-2">New Puzzle</Button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-0.5 bg-border p-0.5 rounded-lg w-fit mx-auto">
        {cells.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`
                relative w-10 h-10 flex items-center justify-center text-lg font-bold cursor-pointer
                ${cell.isBlack ? 'bg-foreground' : 'bg-background'}
                ${selectedCell?.row === r && selectedCell?.col === c ? 'ring-2 ring-primary' : ''}
                ${!cell.isBlack && cell.guess && cell.guess.toUpperCase() === cell.letter ? 'text-primary' : ''}
              `}
              onClick={() => handleCellClick(r, c)}
              onKeyDown={(e) => handleKeyDown(e, r, c)}
              tabIndex={cell.isBlack ? -1 : 0}
            >
              {cell.number && (
                <span className="absolute top-0 left-0.5 text-[8px] text-muted-foreground">
                  {cell.number}
                </span>
              )}
              {!cell.isBlack && cell.guess}
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-bold mb-2">Across</h4>
          {puzzle.across.map((clue) => (
            <p key={clue.number} className="text-muted-foreground">
              <span className="font-medium text-foreground">{clue.number}.</span> {clue.text}
            </p>
          ))}
        </div>
        <div>
          <h4 className="font-bold mb-2">Down</h4>
          {puzzle.down.map((clue) => (
            <p key={clue.number} className="text-muted-foreground">
              <span className="font-medium text-foreground">{clue.number}.</span> {clue.text}
            </p>
          ))}
        </div>
      </div>

      <Button variant="outline" onClick={initializePuzzle} className="w-full">
        New Puzzle
      </Button>
    </div>
  );
};

export default CrosswordGame;
