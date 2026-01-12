import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentionUser {
  id: string;
  display_name: string;
  clip_id: string;
  avatar_url: string | null;
}

export const useMentions = () => {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, clip_id, avatar_url')
        .or(`display_name.ilike.%${query}%,clip_id.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Extract mentions from text (format: @username or @clip_id)
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex) || [];
    return matches.map(m => m.substring(1));
  };

  // Format text with highlighted mentions
  const formatMentions = (text: string): string => {
    return text.replace(/@(\w+)/g, '<span class="text-primary font-medium">@$1</span>');
  };

  // Check if cursor is in a mention
  const getMentionAtCursor = (text: string, cursorPosition: number): string | null => {
    const beforeCursor = text.slice(0, cursorPosition);
    const match = beforeCursor.match(/@(\w*)$/);
    return match ? match[1] : null;
  };

  return {
    suggestions,
    isLoading,
    searchUsers,
    clearSuggestions,
    extractMentions,
    formatMentions,
    getMentionAtCursor,
  };
};
