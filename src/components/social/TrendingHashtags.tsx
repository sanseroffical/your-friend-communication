import { TrendingUp, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useHashtags, Hashtag } from '@/hooks/useHashtags';

interface TrendingHashtagsProps {
  onHashtagClick?: (hashtag: string) => void;
}

const TrendingHashtags = ({ onHashtagClick }: TrendingHashtagsProps) => {
  const { trendingHashtags, loading } = useHashtags();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (trendingHashtags.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {trendingHashtags.map((tag, index) => (
          <button
            key={tag.id}
            onClick={() => onHashtagClick?.(tag.name)}
            className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs w-4">
                {index + 1}
              </span>
              <Hash className="h-3 w-3 text-primary" />
              <span className="font-medium text-sm">{tag.name}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {tag.post_count} {tag.post_count === 1 ? 'post' : 'posts'}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};

export default TrendingHashtags;
