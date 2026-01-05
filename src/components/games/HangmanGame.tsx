import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

const WORDS = [
  'JAVASCRIPT', 'PROGRAMMING', 'DEVELOPER', 'KEYBOARD', 'COMPUTER',
  'ALGORITHM', 'DATABASE', 'NETWORK', 'SECURITY', 'INTERFACE',
  'FUNCTION', 'VARIABLE', 'COMPONENT', 'FRAMEWORK', 'BROWSER'
];

const HANGMAN_STAGES = [
  '',
  '  O  ',
  '  O  \n  |  ',
  '  O  \n /|  ',
  '  O  \n /|\\ ',
  '  O  \n /|\\ \n /   ',
  '  O  \n /|\\ \n / \\ '
];

const HangmanGame = () => {
  const [word, setWord] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuessedLetters(new Set());
    setWrongGuesses(0);
  };

  const guessLetter = (letter: string) => {
    if (guessedLetters.has(letter)) return;
    
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (!word.includes(letter)) {
      setWrongGuesses(prev => prev + 1);
    }
  };

  const displayWord = word
    .split('')
    .map(letter => guessedLetters.has(letter) ? letter : '_')
    .join(' ');

  const isWon = word.split('').every(letter => guessedLetters.has(letter));
  const isLost = wrongGuesses >= 6;
  const isGameOver = isWon || isLost;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Hangman</CardTitle>
        <Button variant="ghost" size="icon" onClick={startNewGame}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="font-mono text-center text-sm h-20 flex items-center justify-center bg-muted rounded p-2">
          {HANGMAN_STAGES[wrongGuesses]}
        </pre>

        <div className="text-center text-2xl font-mono tracking-widest">
          {displayWord}
        </div>

        {isGameOver && (
          <div className={`text-center font-bold ${isWon ? 'text-green-500' : 'text-destructive'}`}>
            {isWon ? '🎉 You won!' : `💀 Game Over! Word: ${word}`}
          </div>
        )}

        <div className="flex flex-wrap gap-1 justify-center">
          {alphabet.map(letter => (
            <Button
              key={letter}
              variant={guessedLetters.has(letter) ? 'secondary' : 'outline'}
              size="sm"
              className="w-8 h-8 p-0 text-xs"
              disabled={guessedLetters.has(letter) || isGameOver}
              onClick={() => guessLetter(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Wrong guesses: {wrongGuesses}/6
        </p>
      </CardContent>
    </Card>
  );
};

export default HangmanGame;
