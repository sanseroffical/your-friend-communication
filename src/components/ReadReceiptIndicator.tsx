import { Check, CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadReceiptIndicatorProps {
  isSent: boolean;
  readBy: string[];
  isOwnMessage: boolean;
}

const ReadReceiptIndicator = ({ isSent, readBy, isOwnMessage }: ReadReceiptIndicatorProps) => {
  if (!isOwnMessage) return null;

  const hasBeenRead = readBy.length > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex ml-1">
            {hasBeenRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasBeenRead ? `Read by ${readBy.length}` : 'Sent'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReadReceiptIndicator;
