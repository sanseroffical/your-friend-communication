import { useState } from "react";
import { Button } from "@/components/ui/button";

const EASY_PUZZLES = [
  [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9],
  ],
];

const SOLUTIONS = [
  [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9],
  ],
];

const SudokuGame = () => {
  const [puzzleIdx] = useState(0);
  const [board, setBoard] = useState<number[][]>(JSON.parse(JSON.stringify(EASY_PUZZLES[puzzleIdx])));
  const [original] = useState<number[][]>(JSON.parse(JSON.stringify(EASY_PUZZLES[puzzleIdx])));
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);

  const isValid = (row: number, col: number, num: number): boolean => {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && board[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && board[r][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && board[r][c] === num) return false;
      }
    }
    return true;
  };

  const handleCellClick = (row: number, col: number) => {
    if (original[row][col] !== 0) return; // Can't modify original numbers
    setSelected({ row, col });
  };

  const handleNumberInput = (num: number) => {
    if (!selected) return;
    const { row, col } = selected;
    if (original[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);

    // Check for errors
    const newErrors = new Set<string>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newBoard[r][c] !== 0 && !isValid(r, c, newBoard[r][c])) {
          newErrors.add(`${r}-${c}`);
        }
      }
    }
    setErrors(newErrors);

    // Check win
    if (newErrors.size === 0 && newBoard.flat().every(n => n !== 0)) {
      setWon(true);
    }
  };

  const handleClear = () => {
    if (!selected) return;
    const { row, col } = selected;
    if (original[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = 0;
    setBoard(newBoard);
    
    // Recalculate errors
    const newErrors = new Set<string>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newBoard[r][c] !== 0 && !isValid(r, c, newBoard[r][c])) {
          newErrors.add(`${r}-${c}`);
        }
      }
    }
    setErrors(newErrors);
  };

  const resetGame = () => {
    setBoard(JSON.parse(JSON.stringify(EASY_PUZZLES[puzzleIdx])));
    setSelected(null);
    setErrors(new Set());
    setWon(false);
  };

  return (
    <div className="text-center p-2">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Sudoku</h3>
        <Button size="sm" variant="outline" onClick={resetGame}>Reset</Button>
      </div>

      {won && (
        <div className="mb-3 p-2 bg-green-500/20 text-green-500 rounded">
          🎉 Congratulations! You solved it!
        </div>
      )}

      <div className="grid grid-cols-9 gap-0 border-2 border-foreground mx-auto w-fit">
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isSelected = selected?.row === rowIdx && selected?.col === colIdx;
            const isOriginal = original[rowIdx][colIdx] !== 0;
            const hasError = errors.has(`${rowIdx}-${colIdx}`);
            const borderRight = (colIdx + 1) % 3 === 0 && colIdx < 8 ? 'border-r-2 border-r-foreground' : 'border-r border-r-border';
            const borderBottom = (rowIdx + 1) % 3 === 0 && rowIdx < 8 ? 'border-b-2 border-b-foreground' : 'border-b border-b-border';

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                className={`w-7 h-7 text-sm font-mono flex items-center justify-center ${borderRight} ${borderBottom} ${
                  isSelected ? 'bg-primary/30' : ''
                } ${isOriginal ? 'font-bold text-foreground' : 'text-primary'} ${
                  hasError ? 'bg-destructive/30 text-destructive' : ''
                }`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
              >
                {cell !== 0 ? cell : ''}
              </button>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-5 gap-1 mt-4 max-w-48 mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <Button
            key={num}
            size="sm"
            variant="outline"
            className="w-8 h-8 p-0"
            onClick={() => handleNumberInput(num)}
            disabled={!selected}
          >
            {num}
          </Button>
        ))}
        <Button
          size="sm"
          variant="destructive"
          className="w-8 h-8 p-0"
          onClick={handleClear}
          disabled={!selected}
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

export default SudokuGame;
