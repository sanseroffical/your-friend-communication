-- Create function to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user levels table
CREATE TABLE public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_levels
CREATE POLICY "Anyone can view user levels"
ON public.user_levels FOR SELECT
USING (true);

CREATE POLICY "Users can insert own level"
ON public.user_levels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own level"
ON public.user_levels FOR UPDATE
USING (auth.uid() = user_id);

-- Create quests table
CREATE TABLE public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  quest_type TEXT NOT NULL DEFAULT 'daily',
  requirement_type TEXT NOT NULL,
  requirement_count INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- RLS policies for quests
CREATE POLICY "Anyone can view active quests"
ON public.quests FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quests"
ON public.quests FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create user quest progress table
CREATE TABLE public.user_quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id)
);

-- Enable RLS
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_quest_progress
CREATE POLICY "Users can view own quest progress"
ON public.user_quest_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest progress"
ON public.user_quest_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress"
ON public.user_quest_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default quests
INSERT INTO public.quests (title, description, xp_reward, quest_type, requirement_type, requirement_count) VALUES
('First Message', 'Send your first message in a chat room', 50, 'achievement', 'messages_sent', 1),
('Social Butterfly', 'Send 10 messages today', 25, 'daily', 'messages_sent', 10),
('Chatterbox', 'Send 50 messages', 100, 'achievement', 'messages_sent', 50),
('Game On', 'Play your first mini-game', 30, 'achievement', 'games_played', 1),
('Gamer', 'Play 5 games today', 40, 'daily', 'games_played', 5),
('Making Friends', 'Add your first friend', 75, 'achievement', 'friends_made', 1),
('Popular', 'Have 5 friends', 150, 'achievement', 'friends_made', 5),
('Content Creator', 'Create your first post', 50, 'achievement', 'posts_created', 1),
('Blogger', 'Create 10 posts', 200, 'achievement', 'posts_created', 10),
('Story Teller', 'Share your first story', 40, 'achievement', 'stories_shared', 1),
('Weekly Warrior', 'Be active for 7 days', 300, 'weekly', 'days_active', 7),
('High Scorer', 'Get a high score in any game', 100, 'achievement', 'high_scores', 1);

-- Enable realtime for levels
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_quest_progress;

-- Create triggers for timestamps
CREATE TRIGGER update_user_levels_updated_at
BEFORE UPDATE ON public.user_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_quest_progress_updated_at
BEFORE UPDATE ON public.user_quest_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();