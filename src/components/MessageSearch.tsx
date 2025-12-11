import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
}

interface MessageSearchProps {
  roomCode: string;
  onSelectMessage: (messageId: string) => void;
  onClose: () => void;
}

const MessageSearch = ({ roomCode, onSelectMessage, onClose }: MessageSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from("messages")
        .select("id, content, sender_name, created_at")
        .eq("room_code", roomCode)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setResults(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, roomCode]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="absolute inset-x-0 top-0 bg-background border-b shadow-lg z-10">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1"
            autoFocus
          />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {(results.length > 0 || query.trim()) && (
        <ScrollArea className="max-h-64 border-t">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y">
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onSelectMessage(result.id);
                    onClose();
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{result.sender_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(result.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </p>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-4 text-center text-muted-foreground">
              No messages found
            </div>
          ) : null}
        </ScrollArea>
      )}
    </div>
  );
};

export default MessageSearch;