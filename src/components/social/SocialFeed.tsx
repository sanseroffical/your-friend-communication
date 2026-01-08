import { useState } from 'react';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { SocialPost, PostComment } from '@/hooks/useSocial';
import TranslateButton from '@/components/TranslateButton';

interface SocialFeedProps {
  posts: SocialPost[];
  currentUserId: string | null;
  onToggleLike: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  getComments: (postId: string) => Promise<PostComment[]>;
  addComment: (postId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string, postId: string) => Promise<void>;
  onUserClick?: (userId: string) => void;
}

const PostCard = ({ 
  post, 
  currentUserId, 
  onToggleLike, 
  onDeletePost,
  getComments,
  addComment,
  deleteComment,
  onUserClick
}: { 
  post: SocialPost;
  currentUserId: string | null;
} & Omit<SocialFeedProps, 'posts'>) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [translatedLang, setTranslatedLang] = useState<string | null>(null);

  const loadComments = async () => {
    setLoadingComments(true);
    const fetchedComments = await getComments(post.id);
    setComments(fetchedComments);
    setLoadingComments(false);
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment(post.id, newComment);
    setNewComment('');
    await loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId, post.id);
    setComments(comments.filter(c => c.id !== commentId));
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80"
            onClick={() => onUserClick?.(post.user_id)}
          >
            <Avatar>
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback>
                {post.profile?.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{post.profile?.display_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">
                @{post.profile?.clip_id} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {currentUserId === post.user_id && (
            <Button variant="ghost" size="icon" onClick={() => onDeletePost(post.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <p className="whitespace-pre-wrap flex-1">{displayContent}</p>
          <TranslateButton
            text={post.content}
            textId={post.id}
            onTranslate={(translated, lang) => {
              setDisplayContent(lang === 'Original' ? post.content : translated);
              setTranslatedLang(lang === 'Original' ? null : lang);
            }}
          />
        </div>
        {translatedLang && (
          <p className="text-xs text-muted-foreground mt-1">Translated to {translatedLang}</p>
        )}
        {post.image_url && (
          <img
            src={post.image_url} 
            alt="Post image" 
            className="mt-3 rounded-lg max-h-96 w-full object-cover"
          />
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 pt-0">
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => onToggleLike(post.id)}
          >
            <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-destructive text-destructive' : ''}`} />
            {post.likes_count}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleToggleComments}
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count}
          </Button>
        </div>

        {showComments && (
          <div className="w-full border-t pt-3">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : (
              <>
                <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-2 items-start">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {comment.profile?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted rounded-lg p-2">
                        <p className="text-xs font-semibold">{comment.profile?.display_name || 'User'}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      {currentUserId === comment.user_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button size="icon" onClick={handleAddComment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

const SocialFeed = ({ 
  posts, 
  currentUserId, 
  onToggleLike, 
  onDeletePost,
  getComments,
  addComment,
  deleteComment,
  onUserClick
}: SocialFeedProps) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No posts yet. Be the first to share something!
      </div>
    );
  }

  return (
    <div>
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onToggleLike={onToggleLike}
          onDeletePost={onDeletePost}
          getComments={getComments}
          addComment={addComment}
          deleteComment={deleteComment}
          onUserClick={onUserClick}
        />
      ))}
    </div>
  );
};

export default SocialFeed;
