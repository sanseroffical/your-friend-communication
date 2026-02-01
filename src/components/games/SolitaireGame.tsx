import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

type Suit = "♠" | "♥" | "♦" | "♣";
type Color = "black" | "red";

interface Card {
  suit: Suit;
  value: number;
  faceUp: boolean;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const SUIT_COLORS: Record<Suit, Color> = {
  "♠": "black",
  "♣": "black",
  "♥": "red",
  "♦": "red",
};

const VALUE_NAMES: Record<number, string> = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

const SolitaireGame = () => {
  const [tableau, setTableau] = useState<Card[][]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<{ pile: string; index: number; cardIndex: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const createDeck = useCallback((): Card[] => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (let value = 1; value <= 13; value++) {
        deck.push({ suit, value, faceUp: false });
      }
    }
    return deck;
  }, []);

  const shuffle = (array: Card[]): Card[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const initGame = useCallback(() => {
    const deck = shuffle(createDeck());
    const newTableau: Card[][] = [];
    let cardIndex = 0;

    // Deal to tableau
    for (let i = 0; i < 7; i++) {
      newTableau[i] = [];
      for (let j = 0; j <= i; j++) {
        const card = deck[cardIndex++];
        card.faceUp = j === i;
        newTableau[i].push(card);
      }
    }

    // Remaining cards go to stock
    const newStock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

    setTableau(newTableau);
    setFoundations([[], [], [], []]);
    setStock(newStock);
    setWaste([]);
    setSelectedCard(null);
    setMoves(0);
    setWon(false);
  }, [createDeck]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    // Check win condition
    const totalInFoundations = foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalInFoundations === 52) {
      setWon(true);
    }
  }, [foundations]);

  const drawFromStock = () => {
    if (stock.length === 0) {
      // Reset stock from waste
      const newStock = [...waste].reverse().map(c => ({ ...c, faceUp: false }));
      setStock(newStock);
      setWaste([]);
    } else {
      const card = { ...stock[stock.length - 1], faceUp: true };
      setStock(stock.slice(0, -1));
      setWaste([...waste, card]);
    }
    setMoves(m => m + 1);
  };

  const canMoveToFoundation = (card: Card, foundationIndex: number): boolean => {
    const foundation = foundations[foundationIndex];
    if (foundation.length === 0) {
      return card.value === 1;
    }
    const topCard = foundation[foundation.length - 1];
    return card.suit === topCard.suit && card.value === topCard.value + 1;
  };

  const canMoveToTableau = (card: Card, pileIndex: number): boolean => {
    const pile = tableau[pileIndex];
    if (pile.length === 0) {
      return card.value === 13;
    }
    const topCard = pile[pile.length - 1];
    return (
      SUIT_COLORS[card.suit] !== SUIT_COLORS[topCard.suit] &&
      card.value === topCard.value - 1
    );
  };

  const handleCardClick = (pile: string, pileIndex: number, cardIndex: number) => {
    const getCards = (): Card[] | null => {
      if (pile === "waste") return waste.length > 0 ? [waste[waste.length - 1]] : null;
      if (pile === "tableau") {
        const cards = tableau[pileIndex].slice(cardIndex);
        return cards.every(c => c.faceUp) ? cards : null;
      }
      return null;
    };

    const cards = getCards();
    if (!cards || cards.length === 0) return;

    if (selectedCard) {
      // Try to move selected card(s)
      if (pile === "foundation" && selectedCard.pile !== "foundation") {
        // Move single card to foundation
        const sourceCards = selectedCard.pile === "waste"
          ? [waste[waste.length - 1]]
          : tableau[selectedCard.index].slice(selectedCard.cardIndex);
        
        if (sourceCards.length === 1 && canMoveToFoundation(sourceCards[0], pileIndex)) {
          const newFoundations = [...foundations];
          newFoundations[pileIndex] = [...newFoundations[pileIndex], sourceCards[0]];
          setFoundations(newFoundations);

          if (selectedCard.pile === "waste") {
            setWaste(waste.slice(0, -1));
          } else {
            const newTableau = [...tableau];
            newTableau[selectedCard.index] = newTableau[selectedCard.index].slice(0, selectedCard.cardIndex);
            if (newTableau[selectedCard.index].length > 0) {
              newTableau[selectedCard.index][newTableau[selectedCard.index].length - 1].faceUp = true;
            }
            setTableau(newTableau);
          }
          setMoves(m => m + 1);
        }
      } else if (pile === "tableau") {
        // Move to tableau pile
        const sourceCards = selectedCard.pile === "waste"
          ? [waste[waste.length - 1]]
          : selectedCard.pile === "foundation"
          ? [foundations[selectedCard.index][foundations[selectedCard.index].length - 1]]
          : tableau[selectedCard.index].slice(selectedCard.cardIndex);

        if (sourceCards.length > 0 && canMoveToTableau(sourceCards[0], pileIndex)) {
          const newTableau = [...tableau];
          newTableau[pileIndex] = [...newTableau[pileIndex], ...sourceCards];

          if (selectedCard.pile === "waste") {
            setWaste(waste.slice(0, -1));
          } else if (selectedCard.pile === "foundation") {
            const newFoundations = [...foundations];
            newFoundations[selectedCard.index] = newFoundations[selectedCard.index].slice(0, -1);
            setFoundations(newFoundations);
          } else {
            newTableau[selectedCard.index] = newTableau[selectedCard.index].slice(0, selectedCard.cardIndex);
            if (newTableau[selectedCard.index].length > 0) {
              newTableau[selectedCard.index][newTableau[selectedCard.index].length - 1].faceUp = true;
            }
          }
          setTableau(newTableau);
          setMoves(m => m + 1);
        }
      }
      setSelectedCard(null);
    } else {
      // Select card
      if ((pile === "waste" && waste.length > 0) ||
          (pile === "tableau" && tableau[pileIndex][cardIndex]?.faceUp) ||
          (pile === "foundation" && foundations[pileIndex].length > 0)) {
        setSelectedCard({ pile, index: pileIndex, cardIndex });
      }
    }
  };

  const autoMoveToFoundation = () => {
    // Auto-move any card that can go to foundation
    // Check waste
    if (waste.length > 0) {
      const card = waste[waste.length - 1];
      for (let i = 0; i < 4; i++) {
        if (canMoveToFoundation(card, i)) {
          const newFoundations = [...foundations];
          newFoundations[i] = [...newFoundations[i], card];
          setFoundations(newFoundations);
          setWaste(waste.slice(0, -1));
          setMoves(m => m + 1);
          return;
        }
      }
    }

    // Check tableau
    for (let p = 0; p < 7; p++) {
      const pile = tableau[p];
      if (pile.length > 0 && pile[pile.length - 1].faceUp) {
        const card = pile[pile.length - 1];
        for (let i = 0; i < 4; i++) {
          if (canMoveToFoundation(card, i)) {
            const newFoundations = [...foundations];
            newFoundations[i] = [...newFoundations[i], card];
            setFoundations(newFoundations);

            const newTableau = [...tableau];
            newTableau[p] = newTableau[p].slice(0, -1);
            if (newTableau[p].length > 0) {
              newTableau[p][newTableau[p].length - 1].faceUp = true;
            }
            setTableau(newTableau);
            setMoves(m => m + 1);
            return;
          }
        }
      }
    }
  };

  const renderCard = (card: Card | null, isSelected: boolean = false) => {
    if (!card) {
      return (
        <div className="w-12 h-16 border-2 border-dashed border-muted rounded flex items-center justify-center text-muted-foreground">
          ∅
        </div>
      );
    }

    if (!card.faceUp) {
      return (
        <div className="w-12 h-16 bg-primary rounded border-2 border-primary-foreground flex items-center justify-center">
          <span className="text-primary-foreground text-lg">🂠</span>
        </div>
      );
    }

    const color = SUIT_COLORS[card.suit] === "red" ? "text-red-500" : "text-foreground";
    const valueName = VALUE_NAMES[card.value] || card.value.toString();

    return (
      <div className={`w-12 h-16 bg-card rounded border-2 ${isSelected ? "border-primary ring-2 ring-primary" : "border-border"} flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors`}>
        <span className={`text-xs font-bold ${color}`}>{valueName}</span>
        <span className={`text-lg ${color}`}>{card.suit}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2 max-w-full overflow-x-auto">
      <h3 className="text-lg font-bold">🃏 Solitaire</h3>
      <p className="text-sm text-muted-foreground">Moves: {moves}</p>

      {won && (
        <div className="text-center py-2">
          <p className="text-green-500 font-bold text-xl">🎉 You Won!</p>
        </div>
      )}

      {/* Top row: Stock, Waste, Foundations */}
      <div className="flex gap-2 items-start flex-wrap justify-center">
        {/* Stock */}
        <div onClick={drawFromStock} className="cursor-pointer">
          {stock.length > 0 ? renderCard({ suit: "♠", value: 1, faceUp: false }) : (
            <div className="w-12 h-16 border-2 border-dashed border-primary rounded flex items-center justify-center text-primary">
              ↻
            </div>
          )}
        </div>

        {/* Waste */}
        <div onClick={() => handleCardClick("waste", 0, 0)}>
          {waste.length > 0 ? renderCard(waste[waste.length - 1], selectedCard?.pile === "waste") : renderCard(null)}
        </div>

        <div className="w-4" />

        {/* Foundations */}
        {foundations.map((foundation, i) => (
          <div key={i} onClick={() => handleCardClick("foundation", i, foundation.length - 1)}>
            {foundation.length > 0 ? renderCard(foundation[foundation.length - 1], selectedCard?.pile === "foundation" && selectedCard.index === i) : (
              <div className="w-12 h-16 border-2 border-dashed border-primary rounded flex items-center justify-center text-primary text-lg">
                {SUITS[i]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="flex gap-1 items-start flex-wrap justify-center">
        {tableau.map((pile, pileIndex) => (
          <div key={pileIndex} className="flex flex-col items-center" style={{ minHeight: "200px" }}>
            {pile.length === 0 ? (
              <div onClick={() => handleCardClick("tableau", pileIndex, 0)}>
                {renderCard(null)}
              </div>
            ) : (
              pile.map((card, cardIndex) => (
                <div
                  key={cardIndex}
                  onClick={() => handleCardClick("tableau", pileIndex, cardIndex)}
                  style={{ marginTop: cardIndex > 0 ? "-48px" : "0", zIndex: cardIndex }}
                >
                  {renderCard(card, selectedCard?.pile === "tableau" && selectedCard.index === pileIndex && cardIndex >= selectedCard.cardIndex)}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={initGame} variant="outline" size="sm">
          New Game
        </Button>
        <Button onClick={autoMoveToFoundation} variant="outline" size="sm">
          Auto Move
        </Button>
        <Button onClick={() => setSelectedCard(null)} variant="ghost" size="sm">
          Clear Selection
        </Button>
      </div>
    </div>
  );
};

export default SolitaireGame;
