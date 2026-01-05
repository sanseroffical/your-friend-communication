import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Timer, Trophy } from 'lucide-react';

const SENTENCES = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump!",
  "The five boxing wizards jump quickly.",
  "Sphinx of black quartz, judge my vow.",
  "Two driven jocks help fax my big quiz.",
  "The jay, pig, fox, zebra and my wolves quack!",
  "Crazy Frederick bought many very exquisite opal jewels.",
];

const TypingRaceGame = () => {
  const [sentence, setSentence] = useState('');
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(null);
    setAccuracy(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputChange = (value: string) => {
    if (!startTime) {
      setStartTime(Date.now());
    }

    setInput(value);

    if (value === sentence) {
      const end = Date.now();
      setEndTime(end);
      
      const timeInMinutes = (end - startTime!) / 60000;
      const wordCount = sentence.split(' ').length;
      const calculatedWpm = Math.round(wordCount / timeInMinutes);
      setWpm(calculatedWpm);

      // Calculate accuracy
      let correct = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === sentence[i]) correct++;
      }
      setAccuracy(Math.round((correct / sentence.length) * 100));
    }
  };

  const getCharacterClass = (index: number): string => {
    if (index >= input.length) return 'text-muted-foreground';
    if (input[index] === sentence[index]) return 'text-green-500';
    return 'text-red-500 bg-red-500/20';
  };

  const isComplete = endTime !== null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Typing Race
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={startNewGame}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg font-mono text-sm leading-relaxed">
          {sentence.split('').map((char, i) => (
            <span key={i} className={getCharacterClass(i)}>
              {char}
            </span>
          ))}
        </div>

        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Start typing..."
          disabled={isComplete}
          className="font-mono"
        />

        {isComplete && (
          <div className="p-4 bg-primary/10 rounded-lg space-y-2">
            <div className="flex items-center justify-center gap-2 text-lg font-bold text-primary">
              <Trophy className="h-5 w-5" />
              Complete!
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{wpm}</p>
                <p className="text-xs text-muted-foreground">Words per minute</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>
            <Button onClick={startNewGame} className="w-full mt-2">
              Try Again
            </Button>
          </div>
        )}

        {!isComplete && startTime && (
          <p className="text-center text-sm text-muted-foreground">
            Keep typing...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TypingRaceGame;
