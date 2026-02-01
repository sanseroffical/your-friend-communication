import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

const CELL_SIZE = 20;

interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

const MazeGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  const [won, setWon] = useState(false);
  const [moves, setMoves] = useState(0);
  const [size, setSize] = useState(15);

  const generateMaze = useCallback((width: number, height: number) => {
    // Initialize grid
    const grid: Cell[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        grid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }

    // Recursive backtracking to generate maze
    const stack: Cell[] = [];
    const startCell = grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Cell[] = [];

      // Get unvisited neighbors
      const directions = [
        { dx: 0, dy: -1, wall: "top", opposite: "bottom" },
        { dx: 1, dy: 0, wall: "right", opposite: "left" },
        { dx: 0, dy: 1, wall: "bottom", opposite: "top" },
        { dx: -1, dy: 0, wall: "left", opposite: "right" },
      ];

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx].visited) {
          neighbors.push({ ...grid[ny][nx], wall: dir.wall, opposite: dir.opposite } as any);
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)] as any;
        const wall = next.wall as keyof Cell["walls"];
        const opposite = next.opposite as keyof Cell["walls"];

        // Remove walls
        current.walls[wall] = false;
        grid[next.y][next.x].walls[opposite] = false;

        grid[next.y][next.x].visited = true;
        stack.push(grid[next.y][next.x]);
      } else {
        stack.pop();
      }
    }

    return grid;
  }, []);

  const initGame = useCallback(() => {
    const newMaze = generateMaze(size, size);
    setMaze(newMaze);
    setPlayerPos({ x: 0, y: 0 });
    setEndPos({ x: size - 1, y: size - 1 });
    setWon(false);
    setMoves(0);
  }, [size, generateMaze]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (playerPos.x === endPos.x && playerPos.y === endPos.y && maze.length > 0) {
      setWon(true);
    }
  }, [playerPos, endPos, maze]);

  const drawMaze = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || maze.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = size * CELL_SIZE;
    const height = size * CELL_SIZE;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = "hsl(var(--background))";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;

    // Draw walls
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = maze[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + CELL_SIZE, py);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + CELL_SIZE, py);
          ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + CELL_SIZE);
          ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + CELL_SIZE);
          ctx.stroke();
        }
      }
    }

    // Draw end point
    ctx.fillStyle = "hsl(var(--primary))";
    ctx.beginPath();
    ctx.arc(
      endPos.x * CELL_SIZE + CELL_SIZE / 2,
      endPos.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw player
    ctx.fillStyle = "hsl(var(--destructive))";
    ctx.beginPath();
    ctx.arc(
      playerPos.x * CELL_SIZE + CELL_SIZE / 2,
      playerPos.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, [maze, playerPos, endPos, size]);

  useEffect(() => {
    drawMaze();
  }, [drawMaze]);

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (won || maze.length === 0) return;

    const { x, y } = playerPos;
    const cell = maze[y][x];

    // Check if move is valid (no wall in the way)
    if (dx === 1 && cell.walls.right) return;
    if (dx === -1 && cell.walls.left) return;
    if (dy === 1 && cell.walls.bottom) return;
    if (dy === -1 && cell.walls.top) return;

    const newX = x + dx;
    const newY = y + dy;

    if (newX >= 0 && newX < size && newY >= 0 && newY < size) {
      setPlayerPos({ x: newX, y: newY });
      setMoves(m => m + 1);
    }
  }, [won, maze, playerPos, size]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case "ArrowDown":
        case "s":
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case "ArrowLeft":
        case "a":
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case "ArrowRight":
        case "d":
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-bold">🌀 Maze Runner</h3>
      <p className="text-sm text-muted-foreground">
        Navigate to the blue dot • Moves: {moves}
      </p>

      <canvas
        ref={canvasRef}
        className="border border-border rounded"
        style={{ maxWidth: "100%", height: "auto" }}
      />

      {won && (
        <div className="text-center">
          <p className="text-green-500 font-bold">🎉 You escaped in {moves} moves!</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={initGame} variant="outline" size="sm">
          New Maze
        </Button>
        <Button
          onClick={() => setSize(s => Math.max(10, s - 5))}
          variant="outline"
          size="sm"
          disabled={size <= 10}
        >
          Smaller
        </Button>
        <Button
          onClick={() => setSize(s => Math.min(25, s + 5))}
          variant="outline"
          size="sm"
          disabled={size >= 25}
        >
          Larger
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <div />
        <Button variant="outline" size="icon" onClick={() => movePlayer(0, -1)}>↑</Button>
        <div />
        <Button variant="outline" size="icon" onClick={() => movePlayer(-1, 0)}>←</Button>
        <Button variant="outline" size="icon" onClick={() => movePlayer(0, 1)}>↓</Button>
        <Button variant="outline" size="icon" onClick={() => movePlayer(1, 0)}>→</Button>
      </div>
    </div>
  );
};

export default MazeGame;
