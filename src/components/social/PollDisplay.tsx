import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, BarChart3, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isMultiSelect: boolean;
  expiresAt?: string;
  createdAt: string;
  creatorId: string;
  userVotes?: string[];
}

interface PollDisplayProps {
  poll: Poll;
  currentUserId: string | null;
  onVote: (pollId: string, optionIds: string[]) => Promise<void>;
  onDelete?: () => void;
}

const PollDisplay = ({ poll, currentUserId, onVote, onDelete }: PollDisplayProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.userVotes || []);
  const [hasVoted, setHasVoted] = useState((poll.userVotes?.length || 0) > 0);
  const [isVoting, setIsVoting] = useState(false);

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const isOwner = currentUserId === poll.creatorId;
  const canVote = !hasVoted && !isExpired && currentUserId;

  const handleOptionClick = (optionId: string) => {
    if (!canVote) return;

    if (poll.isMultiSelect) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const submitVote = async () => {
    if (selectedOptions.length === 0) return;
    
    setIsVoting(true);
    try {
      await onVote(poll.id, selectedOptions);
      setHasVoted(true);
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (votes: number) => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-medium">Poll</span>
          </div>
          {poll.expiresAt && (
            <div className={`flex items-center gap-1 text-xs ${isExpired ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              <Clock className="w-3 h-3" />
              {isExpired ? 'Ended' : `Ends ${formatDistanceToNow(new Date(poll.expiresAt), { addSuffix: true })}`}
            </div>
          )}
        </div>

        <p className="font-medium">{poll.question}</p>

        <div className="space-y-2">
          {poll.options.map(option => {
            const percentage = getPercentage(option.votes);
            const isSelected = selectedOptions.includes(option.id);
            const showResults = hasVoted || isExpired;

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                disabled={!canVote}
                className={`w-full text-left rounded-lg transition-all ${
                  canVote
                    ? 'hover:bg-accent cursor-pointer'
                    : 'cursor-default'
                } ${isSelected ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="relative p-3 rounded-lg border border-border overflow-hidden">
                  {showResults && (
                    <Progress
                      value={percentage}
                      className="absolute inset-0 h-full rounded-lg"
                    />
                  )}
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {showResults && poll.userVotes?.includes(option.id) && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm">{option.text}</span>
                    </div>
                    {showResults && (
                      <span className="text-sm font-medium">
                        {percentage}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}
            {poll.isMultiSelect && ' • Multiple choice'}
          </p>
          
          <div className="flex gap-2">
            {canVote && selectedOptions.length > 0 && (
              <Button
                size="sm"
                onClick={submitVote}
                disabled={isVoting}
              >
                {isVoting ? 'Voting...' : 'Vote'}
              </Button>
            )}
            {isOwner && onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PollDisplay;
