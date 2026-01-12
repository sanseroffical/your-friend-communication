import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Hashtag {
  id: string;
  name: string;
  post_count: number;
  created_at: string;
}

export const useHashtags = () => {
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrendingHashtags(data || []);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractHashtags = (content: string): string[] => {
    const regex = /#(\w+)/g;
    const matches = content.match(regex);
    return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
  };

  const processHashtags = async (postId: string, content: string) => {
    const tags = extractHashtags(content);
    if (tags.length === 0) return;

    for (const tag of tags) {
      try {
        // Upsert hashtag
        let { data: existingTag } = await supabase
          .from('hashtags')
          .select('id, post_count')
          .eq('name', tag)
          .maybeSingle();

        if (existingTag) {
          // Update count
          await supabase
            .from('hashtags')
            .update({ post_count: existingTag.post_count + 1 })
            .eq('id', existingTag.id);

          // Link post to hashtag
          await supabase
            .from('post_hashtags')
            .insert({ post_id: postId, hashtag_id: existingTag.id });
        } else {
          // Create new hashtag
          const { data: newTag } = await supabase
            .from('hashtags')
            .insert({ name: tag, post_count: 1 })
            .select('id')
            .single();

          if (newTag) {
            await supabase
              .from('post_hashtags')
              .insert({ post_id: postId, hashtag_id: newTag.id });
          }
        }
      } catch (error) {
        console.error('Error processing hashtag:', tag, error);
      }
    }
  };

  const searchByHashtag = async (hashtag: string) => {
    try {
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('name', hashtag.toLowerCase())
        .maybeSingle();

      if (!hashtagData) return [];

      const { data: postHashtags } = await supabase
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtagData.id);

      return postHashtags?.map(ph => ph.post_id) || [];
    } catch (error) {
      console.error('Error searching by hashtag:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  return {
    trendingHashtags,
    loading,
    fetchTrending,
    extractHashtags,
    processHashtags,
    searchByHashtag
  };
};
