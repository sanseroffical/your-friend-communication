import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GameSession } from "@/hooks/useGames";
import { cn } from "@/lib/utils";

interface TriviaGameProps {
  game: GameSession;
  userId: string;
  userName: string;
  onJoin: () => void;
  onUpdateState: (state: Record<string, unknown>) => void;
  onEnd: (winnerId?: string) => void;
}

interface Question {
  q: string;
  a: string[];
  correct: number;
}

const TriviaGame = ({ game, userId, userName, onJoin, onUpdateState, onEnd }: TriviaGameProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const state = game.state as {
    currentQuestion: number;
    scores: Record<string, number>;
    questions: Question[];
  };

  const currentQ = state.questions[state.currentQuestion];
  const isLastQuestion = state.currentQuestion >= state.questions.length - 1;
  const myScore = state.scores[userId] || 0;

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === currentQ.correct;
    const newScores = {
      ...state.scores,
      [userId]: myScore + (isCorrect ? 10 : 0),
    };

    setTimeout(() => {
      setSelectedAnswer(null);
      setShowResult(false);

      if (isLastQuestion) {
        // Find winner
        const entries = Object.entries(newScores);
        const maxScore = Math.max(...entries.map(([, score]) => score));
        const winners = entries.filter(([, score]) => score === maxScore);
        onUpdateState({ ...state, scores: newScores });
        setTimeout(() => onEnd(winners.length === 1 ? winners[0][0] : undefined), 500);
      } else {
        onUpdateState({
          ...state,
          currentQuestion: state.currentQuestion + 1,
          scores: newScores,
        });
      }
    }, 2000);
  };

  const progress = ((state.currentQuestion + 1) / state.questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Question {state.currentQuestion + 1} of {state.questions.length}</span>
          <span>Score: {myScore}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question */}
      <div className="bg-muted rounded-lg p-4">
        <h3 className="text-lg font-medium text-center">{currentQ.q}</h3>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 gap-2">
        {currentQ.a.map((answer, index) => (
          <Button
            key={index}
            variant="outline"
            className={cn(
              "w-full justify-start h-auto py-3 px-4 text-left",
              showResult && index === currentQ.correct && "bg-green-500/20 border-green-500",
              showResult && selectedAnswer === index && index !== currentQ.correct && "bg-red-500/20 border-red-500"
            )}
            onClick={() => handleAnswer(index)}
            disabled={selectedAnswer !== null}
          >
            <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
            {answer}
          </Button>
        ))}
      </div>

      {showResult && (
        <p className={cn(
          "text-center font-medium",
          selectedAnswer === currentQ.correct ? "text-green-500" : "text-red-500"
        )}>
          {selectedAnswer === currentQ.correct ? "Correct! +10 points" : "Wrong answer!"}
        </p>
      )}
    </div>
  );
};

export default TriviaGame;
