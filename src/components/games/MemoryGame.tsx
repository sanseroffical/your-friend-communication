import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJIS = ["🎮", "🎯", "🎨", "🎪", "🎭", "🎰", "🎲", "🎳"];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryGame = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const initializeGame = () => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setIsWon(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    if (flippedCards.length === 2) {
      const [first, second] = flippedCards;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard.emoji === secondCard.emoji) {
        setCards(prev =>
          prev.map(card =>
            card.id === first || card.id === second
              ? { ...card, isMatched: true }
              : card
          )
        );
        setFlippedCards([]);
      } else {
        setTimeout(() => {
          setCards(prev =>
            prev.map(card =>
              card.id === first || card.id === second
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
      setMoves(prev => prev + 1);
    }
  }, [flippedCards, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      setIsWon(true);
    }
  }, [cards]);

  const handleCardClick = (index: number) => {
    if (
      flippedCards.length === 2 ||
      flippedCards.includes(index) ||
      cards[index].isMatched ||
      cards[index].isFlipped
    ) {
      return;
    }

    setCards(prev =>
      prev.map((card, i) =>
        i === index ? { ...card, isFlipped: true } : card
      )
    );
    setFlippedCards(prev => [...prev, index]);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full">
        <span className="text-sm font-medium">Moves: {moves}</span>
        <Button size="sm" variant="outline" onClick={initializeGame}>
          New Game
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={cn(
              "w-14 h-14 rounded-lg flex items-center justify-center text-2xl transition-all duration-300",
              card.isFlipped || card.isMatched
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80",
              card.isMatched && "bg-green-500"
            )}
            disabled={card.isFlipped || card.isMatched}
          >
            {(card.isFlipped || card.isMatched) ? card.emoji : "?"}
          </button>
        ))}
      </div>

      {isWon && (
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">You won! 🎉</p>
          <p className="text-sm text-muted-foreground">Completed in {moves} moves</p>
        </div>
      )}
    </div>
  );
};

export default MemoryGame;
