import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UpdateEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changes: string[];
  released_at: string;
}

const UpdateLog = () => {
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      const { data, error } = await supabase
        .from('update_log')
        .select('*')
        .order('released_at', { ascending: false });

      if (!error && data) {
        setUpdates(data.map(u => ({
          ...u,
          changes: Array.isArray(u.changes) ? (u.changes as string[]) : [],
        })));
        if (data.length > 0) {
          setExpandedId(data[0].id);
        }
      }
      setIsLoading(false);
    };

    fetchUpdates();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Updates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading updates...</p>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No updates yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {updates.map((update, index) => (
                <div
                  key={update.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{update.version}
                      </Badge>
                      <div>
                        <h3 className="font-medium">{update.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(update.released_at)}
                        </p>
                      </div>
                    </div>
                    {expandedId === update.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedId === update.id && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      {update.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {update.description}
                        </p>
                      )}
                      {update.changes.length > 0 && (
                        <ul className="space-y-1">
                          {update.changes.map((change, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {change}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateLog;
