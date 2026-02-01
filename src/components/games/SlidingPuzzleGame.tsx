import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

type NumberValue = number | null;

interface SlidingPuzzleState {
  tiles: NumberValue[];
  size: number;
  moves: number;
  won: boolean;
}

const SlidingPuzzleGame = () => {
  const [state, setState] = useState<SlidingPuzzleState>({
    tiles: [],
    size: 3,
    moves: 0,
    won: false,
  });
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});

  const createSolvedPuzzle = (size: number): NumberValue[] => {
    const tiles: NumberValue[] = [];
    for (let i = 1; i < size * size; i++) {
      tiles.push(i);
    }
    tiles.push(null);
    return tiles;
  };

  const isSolved = (tiles: NumberValue[]): boolean => {
    for (let i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[tiles.length - 1] === null;
  };

  const isSolvable = (tiles: NumberValue[], size: number): boolean => {
    let inversions = 0;
    const flatTiles = tiles.filter((t): t is number => t !== null);
    
    for (let i = 0; i < flatTiles.length; i++) {
      for (let j = i + 1; j < flatTiles.length; j++) {
        if (flatTiles[i] > flatTiles[j]) {
          inversions++;
        }
      }
    }

    if (size % 2 === 1) {
      return inversions % 2 === 0;
    } else {
      const emptyRow = Math.floor(tiles.indexOf(null) / size);
      return (inversions + emptyRow) % 2 === 1;
    }
  };

  const shuffle = useCallback((size: number): NumberValue[] => {
    let tiles: NumberValue[];
    do {
      tiles = createSolvedPuzzle(size);
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
      }
    } while (!isSolvable(tiles, size) || isSolved(tiles));
    
    return tiles;
  }, []);

  const initGame = useCallback((size: number = state.size) => {
    setState({
      tiles: shuffle(size),
      size,
      moves: 0,
      won: false,
    });
  }, [shuffle, state.size]);

  useEffect(() => {
    initGame(3);
  }, []);

  const getEmptyIndex = (): number => state.tiles.indexOf(null);

  const canMove = (index: number): boolean => {
    const emptyIndex = getEmptyIndex();
    const { size } = state;
    
    const row = Math.floor(index / size);
    const col = index % size;
    const emptyRow = Math.floor(emptyIndex / size);
    const emptyCol = emptyIndex % size;

    return (
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow)
    );
  };

  const moveTile = (index: number) => {
    if (state.won || !canMove(index)) return;

    const newTiles = [...state.tiles];
    const emptyIndex = getEmptyIndex();
    [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];

    const won = isSolved(newTiles);
    const moves = state.moves + 1;

    if (won) {
      const currentBest = bestMoves[state.size];
      if (!currentBest || moves < currentBest) {
        setBestMoves(prev => ({ ...prev, [state.size]: moves }));
      }
    }

    setState(prev => ({
      ...prev,
      tiles: newTiles,
      moves,
      won,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.won) return;

      const emptyIndex = getEmptyIndex();
      const { size } = state;
      const row = Math.floor(emptyIndex / size);
      const col = emptyIndex % size;

      let targetIndex = -1;

      switch (e.key) {
        case "ArrowUp":
          if (row < size - 1) targetIndex = emptyIndex + size;
          break;
        case "ArrowDown":
          if (row > 0) targetIndex = emptyIndex - size;
          break;
        case "ArrowLeft":
          if (col < size - 1) targetIndex = emptyIndex + 1;
          break;
        case "ArrowRight":
          if (col > 0) targetIndex = emptyIndex - 1;
          break;
      }

      if (targetIndex >= 0 && targetIndex < state.tiles.length) {
        e.preventDefault();
        moveTile(targetIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state]);

  const tileSize = state.size === 3 ? "w-20 h-20 text-2xl" : 
                   state.size === 4 ? "w-16 h-16 text-xl" : 
                   "w-12 h-12 text-lg";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h3 className="text-lg font-bold">🧩 Sliding Puzzle</h3>
      <p className="text-sm text-muted-foreground">Arrange numbers in order</p>

      <div className="flex gap-4 text-sm">
        <span>Moves: <strong>{state.moves}</strong></span>
        {bestMoves[state.size] && (
          <span>Best: <strong className="text-primary">{bestMoves[state.size]}</strong></span>
        )}
      </div>

      <div
        className="grid gap-1 bg-muted p-2 rounded-lg"
        style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}
      >
        {state.tiles.map((tile, index) => (
          <button
            key={index}
            onClick={() => moveTile(index)}
            disabled={tile === null || state.won}
            className={`${tileSize} rounded-lg font-bold transition-all duration-150 ${
              tile === null
                ? "bg-transparent"
                : canMove(index)
                ? "bg-primary text-primary-foreground hover:scale-105 cursor-pointer"
                : "bg-card border-2 border-border text-foreground cursor-default"
            }`}
          >
            {tile}
          </button>
        ))}
      </div>

      {state.won && (
        <div className="text-center">
          <p className="text-green-500 font-bold text-xl">🎉 Solved in {state.moves} moves!</p>
          {state.moves === bestMoves[state.size] && (
            <p className="text-yellow-500">🏆 New Record!</p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        <Button onClick={() => initGame()} variant="outline" size="sm">
          Shuffle
        </Button>
        {[3, 4, 5].map(size => (
          <Button
            key={size}
            onClick={() => initGame(size)}
            variant={state.size === size ? "default" : "outline"}
            size="sm"
          >
            {size}×{size}
          </Button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Use arrow keys or click tiles</p>
    </div>
  );
};

export default SlidingPuzzleGame;
