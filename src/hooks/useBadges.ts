import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

export const BADGE_DEFINITIONS = {
  first_post: { name: 'First Post', icon: '📝', description: 'Created your first post' },
  social_butterfly: { name: 'Social Butterfly', icon: '🦋', description: '10+ followers' },
  storyteller: { name: 'Storyteller', icon: '📖', description: 'Posted 5 stories' },
  early_adopter: { name: 'Early Adopter', icon: '🌟', description: 'Joined during beta' },
  verified: { name: 'Verified', icon: '✓', description: 'Verified user' },
  popular: { name: 'Popular', icon: '🔥', description: '100+ likes on posts' },
  chatterbox: { name: 'Chatterbox', icon: '💬', description: 'Sent 100+ messages' },
  gamer: { name: 'Gamer', icon: '🎮', description: 'Won 10 games' },
  night_owl: { name: 'Night Owl', icon: '🦉', description: 'Active after midnight' },
  photographer: { name: 'Photographer', icon: '📷', description: 'Posted 10 images' },
};

export const useBadges = (userId: string | null) => {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBadges = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const awardBadge = async (badgeType: string) => {
    if (!userId) return false;

    const badgeDef = BADGE_DEFINITIONS[badgeType as keyof typeof BADGE_DEFINITIONS];
    if (!badgeDef) return false;

    // Check if already has badge
    if (badges.some(b => b.badge_type === badgeType)) return false;

    try {
      // Server-side validates eligibility before granting
      const { data: granted, error } = await supabase.rpc('award_badge', {
        p_badge_type: badgeType,
        p_badge_name: badgeDef.name,
      });
      if (error) throw error;
      if (!granted) return false;

      toast({
        title: '🏆 Badge Earned!',
        description: `You earned the "${badgeDef.name}" badge!`
      });

      await fetchBadges();
      return true;
    } catch (error: any) {
      console.error('Error awarding badge:', error);
      return false;
    }
  };

  const checkAndAwardBadges = async () => {
    if (!userId) return;

    // Check for first_post badge
    const { count: postCount } = await supabase
      .from('social_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (postCount && postCount >= 1) {
      await awardBadge('first_post');
    }

    // Check for social_butterfly badge (10+ followers)
    const { count: followerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (followerCount && followerCount >= 10) {
      await awardBadge('social_butterfly');
    }

    // Check for storyteller badge (5+ stories)
    const { count: storyCount } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (storyCount && storyCount >= 5) {
      await awardBadge('storyteller');
    }

    // Check for photographer badge (10+ image posts)
    const { count: imageCount } = await supabase
      .from('social_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('image_url', 'is', null);

    if (imageCount && imageCount >= 10) {
      await awardBadge('photographer');
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  return {
    badges,
    loading,
    awardBadge,
    checkAndAwardBadges,
    fetchBadges,
    BADGE_DEFINITIONS
  };
};
