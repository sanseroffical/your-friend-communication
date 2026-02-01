import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter, Calendar, User } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
  room_code: string;
}

interface AdvancedSearchProps {
  roomCode: string;
  onSelectMessage: (messageId: string) => void;
  onClose: () => void;
}

const AdvancedSearch = ({ roomCode, onSelectMessage, onClose }: AdvancedSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    sender: '',
    dateFrom: '',
    dateTo: '',
    hasAttachment: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chat-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('chat-recent-searches', JSON.stringify(updated));
  };

  const performSearch = useCallback(async () => {
    if (!query.trim() && !filters.sender && !filters.dateFrom && !filters.dateTo) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      let searchQuery = supabase
        .from('messages')
        .select('id, content, sender_name, created_at, room_code, attachment_url')
        .eq('room_code', roomCode);

      if (query.trim()) {
        searchQuery = searchQuery.ilike('content', `%${query}%`);
      }

      if (filters.sender) {
        searchQuery = searchQuery.ilike('sender_name', `%${filters.sender}%`);
      }

      if (filters.dateFrom) {
        searchQuery = searchQuery.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        searchQuery = searchQuery.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      if (filters.hasAttachment) {
        searchQuery = searchQuery.not('attachment_url', 'is', null);
      }

      const { data, error } = await searchQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResults(data || []);
      
      if (query.trim()) {
        saveRecentSearch(query.trim());
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, roomCode]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : part
    );
  };

  const clearFilters = () => {
    setFilters({ sender: '', dateFrom: '', dateTo: '', hasAttachment: false });
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="absolute inset-4 bg-background border border-border rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Filters</h4>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> From User
                  </label>
                  <Input
                    placeholder="Username..."
                    value={filters.sender}
                    onChange={(e) => setFilters(f => ({ ...f, sender: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> From
                    </label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.hasAttachment}
                    onChange={(e) => setFilters(f => ({ ...f, hasAttachment: e.target.checked }))}
                    className="rounded"
                  />
                  Has attachment
                </label>

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Recent searches */}
        {!query && recentSearches.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {recentSearches.map((term, i) => (
              <Button
                key={i}
                variant="secondary"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setQuery(term)}
              >
                {term}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {query || activeFilterCount > 0 ? 'No messages found' : 'Start typing to search'}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelectMessage(result.id);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{result.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(result.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdvancedSearch;
