
-- 1) Restrict benchmark_results reads to authenticated users
DROP POLICY IF EXISTS "Anyone can view benchmark results" ON public.benchmark_results;
CREATE POLICY "Authenticated users can view benchmark results"
  ON public.benchmark_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 2) Server-side validation for game_scores (score range + game_type allowlist)
ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_score_range_check;
ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_score_range_check
  CHECK (score BETWEEN 0 AND 10000000);

ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_time_range_check;
ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_time_range_check
  CHECK (time_seconds IS NULL OR (time_seconds BETWEEN 0 AND 86400));

ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_game_type_format_check;
ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_game_type_format_check
  CHECK (game_type ~ '^[a-z0-9_]{1,40}$');

ALTER TABLE public.game_scores
  DROP CONSTRAINT IF EXISTS game_scores_difficulty_format_check;
ALTER TABLE public.game_scores
  ADD CONSTRAINT game_scores_difficulty_format_check
  CHECK (difficulty IS NULL OR difficulty ~ '^[a-z0-9_-]{1,20}$');
