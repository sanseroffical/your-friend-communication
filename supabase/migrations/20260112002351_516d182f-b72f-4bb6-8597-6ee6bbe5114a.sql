-- Story reactions table
CREATE TABLE public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Story replies table
CREATE TABLE public.story_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hashtags table
CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Post hashtags junction table
CREATE TABLE public.post_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  UNIQUE(post_id, hashtag_id)
);

-- Bookmarks table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- User badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Story highlights table
CREATE TABLE public.story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Highlight stories junction
CREATE TABLE public.highlight_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_id UUID NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add profile music and gif avatar columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_music_url TEXT,
ADD COLUMN IF NOT EXISTS gif_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS visitor_count INTEGER DEFAULT 0;

-- Enable RLS on all tables
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

-- Story reactions policies
CREATE POLICY "Anyone can view story reactions" ON public.story_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);

-- Story replies policies
CREATE POLICY "Anyone can view story replies" ON public.story_replies FOR SELECT USING (true);
CREATE POLICY "Users can add replies" ON public.story_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.story_replies FOR DELETE USING (auth.uid() = user_id);

-- Hashtags policies (public read)
CREATE POLICY "Anyone can view hashtags" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can create hashtags" ON public.hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hashtag counts" ON public.hashtags FOR UPDATE USING (true);

-- Post hashtags policies
CREATE POLICY "Anyone can view post hashtags" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can create post hashtags" ON public.post_hashtags FOR INSERT WITH CHECK (true);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- User badges policies
CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can add badges" ON public.user_badges FOR INSERT WITH CHECK (true);

-- Story highlights policies
CREATE POLICY "Anyone can view highlights" ON public.story_highlights FOR SELECT USING (true);
CREATE POLICY "Users can manage own highlights" ON public.story_highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON public.story_highlights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON public.story_highlights FOR DELETE USING (auth.uid() = user_id);

-- Highlight stories policies
CREATE POLICY "Anyone can view highlight stories" ON public.highlight_stories FOR SELECT USING (true);
CREATE POLICY "Highlight owners can add stories" ON public.highlight_stories FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.story_highlights WHERE id = highlight_id AND user_id = auth.uid()));
CREATE POLICY "Highlight owners can remove stories" ON public.highlight_stories FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.story_highlights WHERE id = highlight_id AND user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;