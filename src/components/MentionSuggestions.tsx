import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MentionUser } from '@/hooks/useMentions';

interface MentionSuggestionsProps {
  suggestions: MentionUser[];
  onSelect: (user: MentionUser) => void;
  isLoading?: boolean;
}

const MentionSuggestions = ({ suggestions, onSelect, isLoading }: MentionSuggestionsProps) => {
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
      {isLoading ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
      ) : (
        suggestions.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelect(user)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {user.display_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.display_name}</p>
              <p className="text-xs text-muted-foreground">@{user.clip_id}</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
};

export default MentionSuggestions;
