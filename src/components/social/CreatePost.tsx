import { useState } from 'react';
import { Send, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CreatePostProps {
  onPost: (content: string, imageUrl?: string) => Promise<void>;
  userAvatar?: string | null;
  userName?: string | null;
}

const CreatePost = ({ onPost, userAvatar, userName }: CreatePostProps) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    
    setIsPosting(true);
    await onPost(content);
    setContent('');
    setIsPosting(false);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src={userAvatar || undefined} />
            <AvatarFallback>{userName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handlePost} 
                disabled={!content.trim() || isPosting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;
