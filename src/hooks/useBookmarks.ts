import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export const useBookmarks = (currentUserId: string | null) => {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBookmarks = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', currentUserId);

      if (error) throw error;
      setBookmarks(new Set(data?.map(b => b.post_id) || []));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!currentUserId) return;

    const isBookmarked = bookmarks.has(postId);

    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', postId);

        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        toast({ title: 'Bookmark removed' });
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: currentUserId, post_id: postId });

        setBookmarks(prev => new Set([...prev, postId]));
        toast({ title: 'Bookmarked!' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isBookmarked = (postId: string) => bookmarks.has(postId);

  useEffect(() => {
    fetchBookmarks();

    // Subscribe to realtime
    if (currentUserId) {
      const channel = supabase
        .channel('bookmarks-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${currentUserId}` },
          () => fetchBookmarks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  return {
    bookmarks,
    loading,
    toggleBookmark,
    isBookmarked,
    fetchBookmarks
  };
};
