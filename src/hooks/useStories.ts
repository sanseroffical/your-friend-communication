import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuests } from './useQuests';

export interface Story {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  created_at: string;
  expires_at: string;
  views_count: number;
  user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface StoryGroup {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  stories: Story[];
  hasUnviewed: boolean;
}

export const useStories = (currentUserId: string | null) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { updateQuestProgress } = useQuests();
  const questUpdateRef = useRef(updateQuestProgress);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each story
      const userIds = [...new Set((data || []).map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const storiesWithUsers = (data || []).map(story => ({
        ...story,
        user: profileMap.get(story.user_id) || { display_name: 'User', avatar_url: null }
      }));

      setStories(storiesWithUsers);

      // Fetch viewed stories for current user
      if (currentUserId) {
        const { data: views } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_id', currentUserId);

        setViewedStories(new Set(views?.map(v => v.story_id) || []));
      }

      // Group stories by user
      const groups: Map<string, StoryGroup> = new Map();
      
      // Put current user's stories first
      storiesWithUsers.forEach(story => {
        const existing = groups.get(story.user_id);
        const hasUnviewed = !viewedStories.has(story.id);

        if (existing) {
          existing.stories.push(story);
          if (hasUnviewed) existing.hasUnviewed = true;
        } else {
          groups.set(story.user_id, {
            userId: story.user_id,
            userName: story.user?.display_name || 'User',
            avatarUrl: story.user?.avatar_url || null,
            stories: [story],
            hasUnviewed: hasUnviewed && story.user_id !== currentUserId
          });
        }
      });

      // Sort: current user first, then users with unviewed stories
      const sortedGroups = Array.from(groups.values()).sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        return 0;
      });

      setStoryGroups(sortedGroups);
    } catch (error: any) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createStory = async (mediaFile: File, content?: string) => {
    if (!currentUserId) return false;

    try {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
      const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';

      const { error: uploadError } = await supabase.storage
        .from('social-images')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-images')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: currentUserId,
          content: content || null,
          media_url: publicUrl,
          media_type: mediaType
        });

      if (error) throw error;

      toast({ title: 'Story posted!', description: 'Your story will be visible for 24 hours.' });
      await fetchStories();
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const viewStory = async (storyId: string) => {
    if (!currentUserId) return;

    // Check if already viewed to avoid duplicate quest progress
    const alreadyViewed = viewedStories.has(storyId);

    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: currentUserId
        }, { onConflict: 'story_id,viewer_id' });

      setViewedStories(prev => new Set([...prev, storyId]));

      // Track quest progress for stories viewed (only if not already viewed)
      if (!alreadyViewed) {
        questUpdateRef.current('stories_viewed', 1);
      }
    } catch (error) {
      console.error('Error recording story view:', error);
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      toast({ title: 'Story deleted' });
      await fetchStories();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchStories();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => fetchStories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return {
    stories,
    storyGroups,
    loading,
    viewedStories,
    createStory,
    viewStory,
    deleteStory,
    fetchStories
  };
};
