import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, X, BarChart3 } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
}

interface CreatePollProps {
  onCreatePoll: (question: string, options: string[], isMultiSelect: boolean, expiresIn?: number) => Promise<void>;
  onCancel: () => void;
}

const CreatePoll = ({ onCreatePoll, onCancel }: CreatePollProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(24);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSubmit = async () => {
    const validOptions = options.filter(o => o.text.trim());
    if (!question.trim() || validOptions.length < 2) return;

    setIsSubmitting(true);
    try {
      await onCreatePoll(
        question.trim(),
        validOptions.map(o => o.text.trim()),
        isMultiSelect,
        expiresIn || undefined
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = question.trim() && options.filter(o => o.text.trim()).length >= 2;

  return (
    <Card className="border-primary/50">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="w-5 h-5" />
          <span className="font-semibold">Create a Poll</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="poll-question">Question</Label>
          <Textarea
            id="poll-question"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            className="resize-none"
            rows={2}
          />
          <p className="text-xs text-muted-foreground text-right">{question.length}/200</p>
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={option.id} className="flex gap-2">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option.text}
                onChange={(e) => updateOption(option.id, e.target.value)}
                maxLength={50}
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(option.id)}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="ghost" size="sm" onClick={addOption} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="multi-select"
              checked={isMultiSelect}
              onCheckedChange={setIsMultiSelect}
            />
            <Label htmlFor="multi-select" className="text-sm">
              Allow multiple answers
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <div className="flex gap-2 flex-wrap">
            {[1, 6, 12, 24, 48, 72].map(hours => (
              <Button
                key={hours}
                variant={expiresIn === hours ? "default" : "outline"}
                size="sm"
                onClick={() => setExpiresIn(hours)}
              >
                {hours < 24 ? `${hours}h` : `${hours / 24}d`}
              </Button>
            ))}
            <Button
              variant={expiresIn === null ? "default" : "outline"}
              size="sm"
              onClick={() => setExpiresIn(null)}
            >
              ∞
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePoll;
