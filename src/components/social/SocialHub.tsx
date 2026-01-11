import { useState, useEffect } from 'react';
import { Users, Rss, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useSocial } from '@/hooks/useSocial';
import { useStories } from '@/hooks/useStories';
import SocialFeed from './SocialFeed';
import CreatePost from './CreatePost';
import UserProfile from './UserProfile';
import StoriesBar from './StoriesBar';

interface SocialHubProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SocialHub = ({ isOpen, onOpenChange }: SocialHubProps) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');

  const {
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
  } = useSocial(currentUserId);

  const {
    storyGroups,
    createStory,
    viewStory,
    deleteStory
  } = useStories(currentUserId);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (currentUserId && isOpen) {
      fetchPosts(feedType);
    }
  }, [feedType, isOpen, currentUserId]);

  const handleUserClick = (userId: string) => {
    setViewingProfile(userId);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Social Hub
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          {viewingProfile ? (
            <UserProfile
              userId={viewingProfile}
              currentUserId={currentUserId}
              onBack={() => setViewingProfile(null)}
              getUserPosts={getUserPosts}
              getFollowStats={getFollowStats}
              getWallPosts={getWallPosts}
              postOnWall={postOnWall}
              deleteWallPost={deleteWallPost}
              followUser={followUser}
              unfollowUser={unfollowUser}
              onToggleLike={toggleLike}
              onDeletePost={deletePost}
              getComments={getComments}
              addComment={addComment}
              deleteComment={deleteComment}
            />
          ) : (
            <>
              {/* Stories Section */}
              <StoriesBar
                storyGroups={storyGroups}
                currentUserId={currentUserId}
                userAvatar={userProfile?.avatar_url || null}
                onCreateStory={createStory}
                onViewStory={viewStory}
                onDeleteStory={deleteStory}
              />

              <Tabs value={feedType} onValueChange={(v) => setFeedType(v as 'all' | 'following')} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all" className="gap-2">
                    <Rss className="h-4 w-4" />
                    All Posts
                  </TabsTrigger>
                  <TabsTrigger value="following" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    Following
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <CreatePost
                onPost={createPost}
                userAvatar={userProfile?.avatar_url}
                userName={userProfile?.display_name}
              />

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
              ) : (
                <SocialFeed
                  posts={posts}
                  currentUserId={currentUserId}
                  onToggleLike={toggleLike}
                  onDeletePost={deletePost}
                  getComments={getComments}
                  addComment={addComment}
                  deleteComment={deleteComment}
                  onUserClick={handleUserClick}
                />
              )}
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SocialHub;
