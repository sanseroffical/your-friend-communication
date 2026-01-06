import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    clip_id: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    clip_id: string;
  };
}

export interface WallPost {
  id: string;
  profile_owner_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    clip_id: string;
  };
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export const useSocial = (currentUserId: string | null) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPosts = async (feedType: 'all' | 'following' = 'all') => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedType === 'following') {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);
        
        const followingIds = following?.map(f => f.following_id) || [];
        followingIds.push(currentUserId);
        query = query.in('user_id', followingIds);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      // Fetch profiles, likes, and comments counts
      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          const [profileRes, likesRes, commentsRes, userLikeRes] = await Promise.all([
            supabase.from('profiles').select('display_name, avatar_url, clip_id').eq('id', post.user_id).single(),
            supabase.from('post_likes').select('id', { count: 'exact' }).eq('post_id', post.id),
            supabase.from('post_comments').select('id', { count: 'exact' }).eq('post_id', post.id),
            supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
          ]);

          return {
            ...post,
            profile: profileRes.data || undefined,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            is_liked: !!userLikeRes.data
          };
        })
      );

      setPosts(postsWithDetails);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string, imageUrl?: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('social_posts')
        .insert({ user_id: currentUserId, content, image_url: imageUrl || null });

      if (error) throw error;
      toast({ title: 'Posted!', description: 'Your post is live.' });
      fetchPosts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(posts.filter(p => p.id !== postId));
      toast({ title: 'Deleted', description: 'Post removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
    }
  };

  const toggleLike = async (postId: string) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.is_liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUserId);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUserId });
      }

      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update like', variant: 'destructive' });
    }
  };

  const getComments = async (postId: string): Promise<PostComment[]> => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) return [];

    const commentsWithProfiles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, clip_id')
          .eq('id', comment.user_id)
          .single();
        return { ...comment, profile: profile || undefined };
      })
    );

    return commentsWithProfiles;
  };

  const addComment = async (postId: string, content: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: currentUserId, content });

      if (error) throw error;
      
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;
      
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, comments_count: p.comments_count - 1 } : p
      ));
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: targetUserId });

      if (error) throw error;
      toast({ title: 'Following!', description: 'You are now following this user.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to follow user', variant: 'destructive' });
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (error) throw error;
      toast({ title: 'Unfollowed', description: 'You unfollowed this user.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unfollow user', variant: 'destructive' });
    }
  };

  const getFollowStats = async (userId: string): Promise<FollowStats> => {
    const [followersRes, followingRes, isFollowingRes] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
      currentUserId 
        ? supabase.from('follows').select('id').eq('follower_id', currentUserId).eq('following_id', userId).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    return {
      followers_count: followersRes.count || 0,
      following_count: followingRes.count || 0,
      is_following: !!isFollowingRes.data
    };
  };

  const getWallPosts = async (profileOwnerId: string): Promise<WallPost[]> => {
    const { data, error } = await supabase
      .from('wall_posts')
      .select('*')
      .eq('profile_owner_id', profileOwnerId)
      .order('created_at', { ascending: false });

    if (error) return [];

    const wallPostsWithProfiles = await Promise.all(
      (data || []).map(async (post) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, clip_id')
          .eq('id', post.author_id)
          .single();
        return { ...post, author_profile: profile || undefined };
      })
    );

    return wallPostsWithProfiles;
  };

  const postOnWall = async (profileOwnerId: string, content: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('wall_posts')
        .insert({ profile_owner_id: profileOwnerId, author_id: currentUserId, content });

      if (error) throw error;
      toast({ title: 'Posted!', description: 'Message posted to wall.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to post on wall', variant: 'destructive' });
    }
  };

  const deleteWallPost = async (wallPostId: string) => {
    try {
      const { error } = await supabase.from('wall_posts').delete().eq('id', wallPostId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Wall post removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete wall post', variant: 'destructive' });
    }
  };

  const getUserPosts = async (userId: string): Promise<SocialPost[]> => {
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];

    const postsWithDetails = await Promise.all(
      (data || []).map(async (post) => {
        const [profileRes, likesRes, commentsRes, userLikeRes] = await Promise.all([
          supabase.from('profiles').select('display_name, avatar_url, clip_id').eq('id', post.user_id).single(),
          supabase.from('post_likes').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('post_comments').select('id', { count: 'exact' }).eq('post_id', post.id),
          currentUserId 
            ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle()
            : Promise.resolve({ data: null })
        ]);

        return {
          ...post,
          profile: profileRes.data || undefined,
          likes_count: likesRes.count || 0,
          comments_count: commentsRes.count || 0,
          is_liked: !!userLikeRes.data
        };
      })
    );

    return postsWithDetails;
  };

  useEffect(() => {
    if (currentUserId) {
      fetchPosts();
    }
  }, [currentUserId]);

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
    deletePost,
    toggleLike,
    getComments,
    addComment,
    deleteComment,
    followUser,
    unfollowUser,
    getFollowStats,
    getWallPosts,
    postOnWall,
    deleteWallPost,
    getUserPosts
  };
};
