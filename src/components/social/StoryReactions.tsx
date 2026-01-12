import { useState, useEffect } from 'react';
import { Send, Heart, ThumbsUp, Laugh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoryReactionsProps {
  storyId: string;
  storyOwnerId: string;
  currentUserId: string | null;
}

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

const StoryReactions = ({ storyId, storyOwnerId, currentUserId }: StoryReactionsProps) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState<{ emoji: string; count: number }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReactions();
  }, [storyId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('story_reactions')
      .select('emoji')
      .eq('story_id', storyId);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      });
      setReactions(
        Object.entries(counts)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count)
      );
    }
  };

  const sendReaction = async (emoji: string) => {
    if (!currentUserId) return;

    try {
      await supabase.from('story_reactions').insert({
        story_id: storyId,
        user_id: currentUserId,
        emoji
      });

      await fetchReactions();
    } catch (error: any) {
      if (error.code !== '23505') { // Ignore duplicate
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    }
  };

  const sendReply = async () => {
    if (!currentUserId || !reply.trim()) return;

    setSending(true);
    try {
      await supabase.from('story_replies').insert({
        story_id: storyId,
        user_id: currentUserId,
        content: reply.trim()
      });

      toast({ title: 'Reply sent!' });
      setReply('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!currentUserId || currentUserId === storyOwnerId) {
    // Owner sees reaction counts
    return (
      <div className="absolute bottom-4 left-4 right-4">
        {reactions.length > 0 && (
          <div className="flex gap-2 mb-2 bg-black/40 rounded-full px-3 py-1 w-fit">
            {reactions.slice(0, 4).map(r => (
              <span key={r.emoji} className="text-white text-sm">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 right-4">
      {/* Quick Reactions */}
      <div className="flex justify-center gap-2 mb-3">
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="text-2xl hover:scale-125 transition-transform bg-black/30 rounded-full p-1"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply Input */}
      <div className="flex gap-2">
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to story..."
          className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
          onKeyDown={(e) => e.key === 'Enter' && sendReply()}
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={sendReply}
          disabled={!reply.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default StoryReactions;
