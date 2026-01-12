import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 16;

const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
  O: { shape: [[1, 1], [1, 1]], color: '#eab308' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a855f7' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
};

type TetrominoType = keyof typeof TETROMINOES;

interface Piece {
  type: TetrominoType;
  shape: number[][];
  x: number;
  y: number;
}

const TetrisGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<(string | null)[][]>(() => 
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const getRandomPiece = useCallback((): Piece => {
    const types = Object.keys(TETROMINOES) as TetrominoType[];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      type,
      shape: TETROMINOES[type].shape.map(row => [...row]),
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
    };
  }, []);

  const checkCollision = useCallback((piece: Piece, boardState: (string | null)[][]): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x;
          const newY = piece.y + y;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
          if (newY >= 0 && boardState[newY][newX]) return true;
        }
      }
    }
    return false;
  }, []);

  const mergePiece = useCallback((piece: Piece, boardState: (string | null)[][]): (string | null)[][] => {
    const newBoard = boardState.map(row => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] && piece.y + y >= 0) {
          newBoard[piece.y + y][piece.x + x] = TETROMINOES[piece.type].color;
        }
      }
    }
    return newBoard;
  }, []);

  const clearLines = useCallback((boardState: (string | null)[][]): { board: (string | null)[][]; cleared: number } => {
    const newBoard = boardState.filter(row => row.some(cell => !cell));
    const cleared = BOARD_HEIGHT - newBoard.length;
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }
    return { board: newBoard, cleared };
  }, []);

  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, i) => 
      piece.shape.map(row => row[i]).reverse()
    );
    return { ...piece, shape: rotated };
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || !isPlaying) return;
    const newPiece = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };
    if (!checkCollision(newPiece, board)) {
      setCurrentPiece(newPiece);
    } else if (dy > 0) {
      // Lock piece
      const newBoard = mergePiece(currentPiece, board);
      const { board: clearedBoard, cleared } = clearLines(newBoard);
      setBoard(clearedBoard);
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * level;
        setScore(s => s + points);
        setLines(l => {
          const newLines = l + cleared;
          if (newLines >= level * 10) setLevel(lv => lv + 1);
          return newLines;
        });
      }
      const nextPiece = getRandomPiece();
      if (checkCollision(nextPiece, clearedBoard)) {
        setGameOver(true);
        setIsPlaying(false);
      } else {
        setCurrentPiece(nextPiece);
      }
    }
  }, [currentPiece, board, isPlaying, checkCollision, mergePiece, clearLines, getRandomPiece, level]);

  const handleRotate = useCallback(() => {
    if (!currentPiece || !isPlaying) return;
    const rotated = rotatePiece(currentPiece);
    if (!checkCollision(rotated, board)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, board, isPlaying, rotatePiece, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || !isPlaying) return;
    let newY = currentPiece.y;
    while (!checkCollision({ ...currentPiece, y: newY + 1 }, board)) {
      newY++;
    }
    setCurrentPiece(prev => prev ? { ...prev, y: newY } : null);
    setTimeout(() => movePiece(0, 1), 50);
  }, [currentPiece, board, isPlaying, checkCollision, movePiece]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0); break;
        case 'ArrowRight': movePiece(1, 0); break;
        case 'ArrowDown': movePiece(0, 1); break;
        case 'ArrowUp': handleRotate(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, movePiece, handleRotate, hardDrop]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const interval = setInterval(() => movePiece(0, 1), Math.max(100, 500 - level * 50));
    return () => clearInterval(interval);
  }, [isPlaying, gameOver, movePiece, level]);

  const startGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(getRandomPiece());
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, BOARD_WIDTH * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);

    // Grid
    ctx.strokeStyle = '#1e293b';
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(BOARD_WIDTH * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }

    // Board
    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      });
    });

    // Current piece
    if (currentPiece) {
      ctx.fillStyle = TETROMINOES[currentPiece.type].color;
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell && currentPiece.y + y >= 0) {
            ctx.fillRect(
              (currentPiece.x + x) * CELL_SIZE + 1,
              (currentPiece.y + y) * CELL_SIZE + 1,
              CELL_SIZE - 2,
              CELL_SIZE - 2
            );
          }
        });
      });
    }
  }, [board, currentPiece]);

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      <div className="flex justify-between w-full max-w-[200px] text-xs">
        <div><span className="text-muted-foreground">Score:</span> <span className="font-bold">{score}</span></div>
        <div><span className="text-muted-foreground">Lvl:</span> <span className="font-bold">{level}</span></div>
        <div><span className="text-muted-foreground">Lines:</span> <span className="font-bold">{lines}</span></div>
      </div>

      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH * CELL_SIZE}
        height={BOARD_HEIGHT * CELL_SIZE}
        className="border border-border rounded"
      />

      {isPlaying && (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => movePiece(-1, 0)}>←</Button>
          <Button size="sm" variant="outline" onClick={() => movePiece(0, 1)}>↓</Button>
          <Button size="sm" variant="outline" onClick={handleRotate}>↻</Button>
          <Button size="sm" variant="outline" onClick={() => movePiece(1, 0)}>→</Button>
        </div>
      )}

      {!isPlaying && (
        <Button onClick={startGame} size="sm" className="w-full max-w-[160px]">
          {gameOver ? 'Game Over! Retry' : 'Start'}
        </Button>
      )}

      {isPlaying && (
        <p className="text-[10px] text-muted-foreground">Arrow keys to move, Up to rotate, Space to drop</p>
      )}
    </div>
  );
};

export default TetrisGame;
