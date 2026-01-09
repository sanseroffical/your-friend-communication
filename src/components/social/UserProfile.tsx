import { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, UserMinus, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { SocialPost, WallPost, FollowStats } from '@/hooks/useSocial';
import SocialFeed from './SocialFeed';

interface UserProfileProps {
  userId: string;
  currentUserId: string | null;
  onBack: () => void;
  getUserPosts: (userId: string) => Promise<SocialPost[]>;
  getFollowStats: (userId: string) => Promise<FollowStats>;
  getWallPosts: (userId: string) => Promise<WallPost[]>;
  postOnWall: (userId: string, content: string) => Promise<void>;
  deleteWallPost: (wallPostId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  onToggleLike: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  getComments: (postId: string) => Promise<any[]>;
  addComment: (postId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  clip_id: string;
  profile_theme: string | null;
  card_style: string | null;
}

const PROFILE_THEMES: Record<string, string> = {
  default: 'bg-gradient-to-r from-primary/20 to-primary/10',
  ocean: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/20',
  sunset: 'bg-gradient-to-r from-orange-500/30 to-pink-500/20',
  forest: 'bg-gradient-to-r from-green-500/30 to-emerald-500/20',
  purple: 'bg-gradient-to-r from-purple-500/30 to-violet-500/20',
  dark: 'bg-gradient-to-r from-gray-800/50 to-gray-900/50',
};

const CARD_STYLES: Record<string, string> = {
  default: 'rounded-lg border bg-card',
  glass: 'rounded-lg border bg-card/50 backdrop-blur-sm',
  solid: 'rounded-lg border-2 border-primary bg-card',
  minimal: 'rounded-none border-b bg-transparent',
  rounded: 'rounded-3xl border bg-card shadow-lg',
};

const UserProfile = ({
  userId,
  currentUserId,
  onBack,
  getUserPosts,
  getFollowStats,
  getWallPosts,
  postOnWall,
  deleteWallPost,
  followUser,
  unfollowUser,
  onToggleLike,
  onDeletePost,
  getComments,
  addComment,
  deleteComment
}: UserProfileProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers_count: 0, following_count: 0, is_following: false });
  const [loading, setLoading] = useState(true);
  const [wallMessage, setWallMessage] = useState('');
  const [postingOnWall, setPostingOnWall] = useState(false);

  const isOwnProfile = currentUserId === userId;

  const loadProfile = async () => {
    setLoading(true);
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }

    const [userPosts, stats, wall] = await Promise.all([
      getUserPosts(userId),
      getFollowStats(userId),
      getWallPosts(userId)
    ]);

    setPosts(userPosts);
    setFollowStats(stats);
    setWallPosts(wall);
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (followStats.is_following) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
    setFollowStats(prev => ({
      ...prev,
      is_following: !prev.is_following,
      followers_count: prev.is_following ? prev.followers_count - 1 : prev.followers_count + 1
    }));
  };

  const handleWallPost = async () => {
    if (!wallMessage.trim()) return;
    setPostingOnWall(true);
    await postOnWall(userId, wallMessage);
    setWallMessage('');
    const wall = await getWallPosts(userId);
    setWallPosts(wall);
    setPostingOnWall(false);
  };

  const handleDeleteWallPost = async (wallPostId: string) => {
    await deleteWallPost(wallPostId);
    setWallPosts(wallPosts.filter(p => p.id !== wallPostId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Profile not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const themeGradient = PROFILE_THEMES[profile?.profile_theme || 'default'] || PROFILE_THEMES.default;
  const cardStyleClasses = CARD_STYLES[profile?.card_style || 'default'] || CARD_STYLES.default;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Feed
      </Button>

      <div className={`p-4 ${themeGradient} rounded-lg`}>
        <div className={`${cardStyleClasses} p-6`}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">{profile.display_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold">{profile.display_name || 'User'}</h2>
              <p className="text-muted-foreground">@{profile.clip_id}</p>
              {profile.bio && <p className="mt-2">{profile.bio}</p>}
              <div className="flex gap-4 mt-3 justify-center sm:justify-start">
                <span><strong>{followStats.followers_count}</strong> Followers</span>
                <span><strong>{followStats.following_count}</strong> Following</span>
              </div>
            </div>
            {!isOwnProfile && currentUserId && (
              <Button 
                variant={followStats.is_following ? "outline" : "default"}
                onClick={handleFollowToggle}
                className="gap-2"
              >
                {followStats.is_following ? (
                  <><UserMinus className="h-4 w-4" /> Unfollow</>
                ) : (
                  <><UserPlus className="h-4 w-4" /> Follow</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <SocialFeed
            posts={posts}
            currentUserId={currentUserId}
            onToggleLike={onToggleLike}
            onDeletePost={onDeletePost}
            getComments={getComments}
            addComment={addComment}
            deleteComment={deleteComment}
          />
        </TabsContent>

        <TabsContent value="wall" className="mt-4">
          {currentUserId && (
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={`Write on ${profile.display_name || 'User'}'s wall...`}
                    value={wallMessage}
                    onChange={(e) => setWallMessage(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button 
                    onClick={handleWallPost} 
                    disabled={!wallMessage.trim() || postingOnWall}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {wallPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No wall posts yet</p>
            ) : (
              wallPosts.map(post => (
                <Card key={post.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author_profile?.avatar_url || undefined} />
                        <AvatarFallback>{post.author_profile?.display_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{post.author_profile?.display_name || 'User'}</span>
                          <span className="text-muted-foreground"> · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </p>
                        <p className="mt-1">{post.content}</p>
                      </div>
                      {(currentUserId === post.author_id || currentUserId === post.profile_owner_id) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteWallPost(post.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;
