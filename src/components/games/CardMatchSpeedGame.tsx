import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const SYMBOLS = ['🎮', '🎲', '🎯', '🎪', '🎨', '🎬', '🎭', '🎪', '🏆', '⭐', '🌟', '💎'];
const TIME_LIMIT = 60; // seconds

const CardMatchSpeedGame = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  const gridSize = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 16 : 24;
  const gridCols = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 4 : 6;

  const initializeGame = useCallback(() => {
    const pairCount = gridSize / 2;
    const selectedSymbols = SYMBOLS.slice(0, pairCount);
    const pairs = [...selectedSymbols, ...selectedSymbols];
    
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    
    const newCards: Card[] = pairs.map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));
    
    setCards(newCards);
    setFlippedCards([]);
    setScore(0);
    setMatches(0);
    setTimeLeft(TIME_LIMIT);
    setGameStarted(false);
    setGameOver(false);
    setCombo(0);
  }, [gridSize]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameStarted && !gameOver && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (matches === gridSize / 2 && gameStarted) {
      setGameOver(true);
      const completionTime = TIME_LIMIT - timeLeft;
      if (!bestTime || completionTime < bestTime) {
        setBestTime(completionTime);
      }
    }
  }, [matches, gridSize, timeLeft, bestTime, gameStarted]);

  const handleCardClick = (cardId: number) => {
    if (!gameStarted) setGameStarted(true);
    if (gameOver) return;
    if (flippedCards.length >= 2) return;
    if (cards[cardId].isMatched || cards[cardId].isFlipped) return;
    
    const newCards = [...cards];
    newCards[cardId].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      
      if (cards[first].symbol === cards[second].symbol) {
        // Match found!
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[first].isMatched = true;
            updated[second].isMatched = true;
            return updated;
          });
          
          // Combo system
          const newCombo = combo + 1;
          setCombo(newCombo);
          const comboBonus = Math.min(newCombo, 5) * 10;
          setScore(prev => prev + 100 + comboBonus);
          setMatches(prev => prev + 1);
          setFlippedCards([]);
          
          // Reset combo timer
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
          comboTimerRef.current = setTimeout(() => setCombo(0), 2000);
        }, 200);
      } else {
        // No match
        setCombo(0);
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[first].isFlipped = false;
            updated[second].isFlipped = false;
            return updated;
          });
          setFlippedCards([]);
        }, 500);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-lg font-bold">Score: {score}</div>
        <div className={`text-lg font-mono ${timeLeft <= 10 ? 'text-destructive animate-pulse' : ''}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      <Progress value={(timeLeft / TIME_LIMIT) * 100} className="w-full max-w-md h-2" />

      <div className="flex items-center gap-4 text-sm">
        <span>Matches: {matches}/{gridSize / 2}</span>
        {combo > 1 && (
          <span className="text-primary font-bold animate-bounce">
            🔥 {combo}x Combo!
          </span>
        )}
      </div>

      {!gameStarted && !gameOver && (
        <div className="flex gap-2 mb-2">
          <Button 
            variant={difficulty === 'easy' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => { setDifficulty('easy'); initializeGame(); }}
          >
            Easy (6 pairs)
          </Button>
          <Button 
            variant={difficulty === 'medium' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => { setDifficulty('medium'); initializeGame(); }}
          >
            Medium (8 pairs)
          </Button>
          <Button 
            variant={difficulty === 'hard' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => { setDifficulty('hard'); initializeGame(); }}
          >
            Hard (12 pairs)
          </Button>
        </div>
      )}

      <div 
        className={`grid gap-2 p-4 bg-muted/30 rounded-lg`}
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched || gameOver}
            className={`
              w-14 h-14 rounded-lg text-2xl font-bold transition-all duration-200
              ${card.isMatched 
                ? 'bg-primary/20 scale-95 opacity-50' 
                : card.isFlipped 
                  ? 'bg-primary text-primary-foreground rotate-0' 
                  : 'bg-secondary hover:bg-secondary/80 hover:scale-105'
              }
              ${!card.isFlipped && !card.isMatched ? 'shadow-md' : ''}
            `}
          >
            {card.isFlipped || card.isMatched ? card.symbol : '❓'}
          </button>
        ))}
      </div>

      {gameOver && (
        <div className="text-center p-4 bg-card rounded-lg border">
          {matches === gridSize / 2 ? (
            <>
              <p className="text-2xl font-bold text-primary mb-2">🎉 You Won!</p>
              <p className="text-lg">Time: {formatTime(TIME_LIMIT - timeLeft)}</p>
              {bestTime && (
                <p className="text-sm text-muted-foreground">Best: {formatTime(bestTime)}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-destructive mb-2">⏰ Time's Up!</p>
              <p className="text-lg">Matches: {matches}/{gridSize / 2}</p>
            </>
          )}
          <p className="text-lg mt-2">Final Score: {score}</p>
          <Button onClick={initializeGame} className="mt-4">
            Play Again
          </Button>
        </div>
      )}

      {!gameOver && !gameStarted && (
        <p className="text-sm text-muted-foreground text-center">
          Click any card to start! Match pairs as fast as you can.<br />
          Chain matches for combo bonuses! 🔥
        </p>
      )}
    </div>
  );
};

export default CardMatchSpeedGame;
