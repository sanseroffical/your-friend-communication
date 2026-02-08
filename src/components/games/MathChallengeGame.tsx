import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useGameScores } from '@/hooks/useGameScores';

interface Problem {
  question: string;
  answer: number;
}

const MathChallengeGame = () => {
  const { submitScore } = useGameScores('math-challenge');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateProblem = useCallback((currentLevel: number): Problem => {
    const maxNum = 10 + currentLevel * 5;
    
    let a: number, b: number, op: string, answer: number;
    
    if (currentLevel <= 3) {
      op = Math.random() < 0.5 ? '+' : '-';
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * (op === '-' ? a : maxNum)) + 1;
    } else if (currentLevel <= 6) {
      const operations = ['+', '-', '*'];
      op = operations[Math.floor(Math.random() * 3)];
      a = Math.floor(Math.random() * (op === '*' ? 12 : maxNum)) + 1;
      b = Math.floor(Math.random() * (op === '*' ? 12 : maxNum)) + 1;
      if (op === '-' && b > a) [a, b] = [b, a];
    } else {
      const hardOps = ['+', '-', '*', '/'];
      op = hardOps[Math.floor(Math.random() * 4)];
      
      if (op === '/') {
        b = Math.floor(Math.random() * 12) + 1;
        a = b * (Math.floor(Math.random() * 12) + 1);
      } else {
        a = Math.floor(Math.random() * maxNum) + 1;
        b = Math.floor(Math.random() * maxNum) + 1;
        if (op === '-' && b > a) [a, b] = [b, a];
      }
    }

    switch (op) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '*': answer = a * b; break;
      case '/': answer = a / b; break;
      default: answer = a + b;
    }

    const symbol = op === '*' ? '×' : op === '/' ? '÷' : op;
    return { question: `${a} ${symbol} ${b} = ?`, answer };
  }, []);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setStreak(0);
    setTimeLeft(60);
    setGameActive(true);
    setProblem(generateProblem(1));
    setUserAnswer('');
  };

  useEffect(() => {
    if (!gameActive || timeLeft <= 0) {
      if (gameActive && timeLeft <= 0) {
        setGameActive(false);
        submitScore(score);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, timeLeft, score, submitScore]);

  const checkAnswer = () => {
    if (!problem) return;
    
    const numAnswer = parseFloat(userAnswer);
    if (numAnswer === problem.answer) {
      setFeedback('correct');
      const points = 10 * level + streak * 2;
      setScore(s => s + points);
      setStreak(s => s + 1);
      
      if ((streak + 1) % 5 === 0) {
        setLevel(l => l + 1);
        setTimeLeft(t => Math.min(t + 10, 60));
      }
    } else {
      setFeedback('wrong');
      setStreak(0);
    }

    setTimeout(() => {
      setFeedback(null);
      setProblem(generateProblem(level));
      setUserAnswer('');
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  };

  if (!gameActive) {
    return (
      <div className="p-4 space-y-4 text-center">
        <h3 className="text-lg font-bold">🔢 Math Challenge</h3>
        {score > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-2xl font-bold text-primary">{score} points</p>
            <p className="text-muted-foreground">Level reached: {level}</p>
          </div>
        )}
        <p className="text-muted-foreground">
          Solve math problems as fast as you can! Build streaks for bonus points.
        </p>
        <Button onClick={startGame} className="w-full">
          {score > 0 ? 'Play Again' : 'Start Game'}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">🔢 Math Challenge</h3>
        <div className="flex gap-2">
          <Badge variant="outline">Level {level}</Badge>
          <Badge variant="secondary">{score} pts</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Time: {timeLeft}s</span>
          <span>🔥 Streak: {streak}</span>
        </div>
        <Progress value={(timeLeft / 60) * 100} />
      </div>

      <div className={`
        text-center py-8 rounded-lg transition-colors
        ${feedback === 'correct' ? 'bg-primary/20' : ''}
        ${feedback === 'wrong' ? 'bg-destructive/20' : 'bg-muted'}
      `}>
        <p className="text-4xl font-bold mb-4">{problem?.question}</p>
        <div className="flex gap-2 justify-center max-w-[200px] mx-auto">
          <Input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Answer"
            className="text-center text-xl"
            autoFocus
          />
          <Button onClick={checkAnswer}>→</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'].map((key) => (
          <Button
            key={key}
            variant="outline"
            onClick={() => setUserAnswer(a => a + key)}
            className="h-12 text-lg"
          >
            {key}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setUserAnswer('')}
          className="flex-1"
        >
          Clear
        </Button>
        <Button onClick={checkAnswer} className="flex-1">
          Submit
        </Button>
      </div>
    </div>
  );
};

export default MathChallengeGame;
