-- Create game_scores table for leaderboards
CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  time_seconds INTEGER,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast leaderboard queries
CREATE INDEX idx_game_scores_game_type_score ON public.game_scores(game_type, score DESC);
CREATE INDEX idx_game_scores_user_id ON public.game_scores(user_id);

-- Enable RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view high scores
CREATE POLICY "Anyone can view game scores"
ON public.game_scores
FOR SELECT
USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert their own scores"
ON public.game_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scores
CREATE POLICY "Users can delete their own scores"
ON public.game_scores
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;